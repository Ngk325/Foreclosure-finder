/**
 * Firestore REST client for the Cloudflare Worker (workers/scheduler.js).
 *
 * Cloudflare Workers can't run the Node-only firebase-admin SDK, and the
 * Firestore REST API rejects a bare Web API key as a Bearer token once
 * Firestore is in production (locked) mode — it needs a real OAuth2 access
 * token. This module signs a service-account JWT with the Workers-native
 * Web Crypto API and exchanges it for that access token, then wraps the
 * Firestore REST calls the scheduler needs.
 *
 * env.FIREBASE_SERVICE_ACCOUNT_JSON must be the full JSON key downloaded
 * from Firebase Console → Project Settings → Service Accounts, set as a
 * Worker secret (`wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON`).
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';

function base64url(bytes) {
  let str = typeof bytes === 'string' ? btoa(bytes) : btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

async function signJwt(serviceAccount) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const claims = {
    iss: serviceAccount.client_email,
    scope: FIRESTORE_SCOPE,
    aud: TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + 3600
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaims = base64url(JSON.stringify(claims));
  const unsigned = `${encodedHeader}.${encodedClaims}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  );

  return `${unsigned}.${base64url(signature)}`;
}

let cachedToken = null;
let cachedTokenExpiry = 0;

async function getAccessToken(env) {
  if (cachedToken && Date.now() < cachedTokenExpiry) return cachedToken;

  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const jwt = await signJwt(serviceAccount);

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Firebase access token: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

/** Convert a plain JS value into a Firestore REST "value" object. */
function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === 'object') {
    return { mapValue: { fields: toFirestoreFields(value) } };
  }
  return { stringValue: String(value) };
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    fields[key] = toFirestoreValue(value);
  }
  return fields;
}

/** Convert a Firestore REST "value" object back into a plain JS value. */
function fromFirestoreValue(value) {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in value) return fromFirestoreFields(value.mapValue.fields || {});
  return null;
}

function fromFirestoreFields(fields) {
  const obj = {};
  for (const [key, value] of Object.entries(fields || {})) {
    obj[key] = fromFirestoreValue(value);
  }
  return obj;
}

function firestoreBaseUrl(env) {
  return `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
}

async function firestoreRequest(env, path, options = {}) {
  const token = await getAccessToken(env);
  const response = await fetch(`${firestoreBaseUrl(env)}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`Firestore request failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function addListingAdmin(listingData, env) {
  const doc = await firestoreRequest(env, '/listings', {
    method: 'POST',
    body: JSON.stringify({
      fields: toFirestoreFields({
        case_number: listingData.case_number,
        property_address: listingData.property_address,
        plaintiff: listingData.plaintiff || '',
        defendant: listingData.defendant || '',
        attorney_name: listingData.attorney_name || '',
        attorney_firm: listingData.attorney_firm || '',
        opening_bid: listingData.opening_bid ?? null,
        sale_date: listingData.sale_date || '',
        property_county: listingData.property_county || '',
        sale_type: 'foreclosure',
        scraped_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      })
    })
  });

  return { id: doc.name.split('/').pop(), ...fromFirestoreFields(doc.fields) };
}

export async function addAnalysisAdmin(analysisData, env) {
  const doc = await firestoreRequest(env, '/analysis', {
    method: 'POST',
    body: JSON.stringify({
      fields: toFirestoreFields({
        ...analysisData,
        created_at: new Date()
      })
    })
  });

  return { id: doc.name.split('/').pop(), ...fromFirestoreFields(doc.fields) };
}

/** Page through all listing documents and return their case_number values. */
export async function getExistingCaseNumbersAdmin(env) {
  const caseNumbers = [];
  let pageToken;

  do {
    const params = new URLSearchParams({ pageSize: '300' });
    if (pageToken) params.set('pageToken', pageToken);

    const data = await firestoreRequest(env, `/listings?${params.toString()}`);
    for (const doc of data.documents || []) {
      const caseNumber = doc.fields?.case_number?.stringValue;
      if (caseNumber) caseNumbers.push(caseNumber);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return caseNumbers;
}
