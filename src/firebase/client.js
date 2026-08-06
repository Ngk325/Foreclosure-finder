import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Collection references
export const listingsCol = collection(db, 'listings');
export const propertiesCol = collection(db, 'properties');
export const attorneyCol = collection(db, 'attorney_contacts');
export const outreachCol = collection(db, 'outreach_log');
export const analysisCol = collection(db, 'analysis');

export async function addListing(data) {
  return addDoc(listingsCol, {
    ...data,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now()
  });
}

export async function getListingByCase(caseNumber) {
  const q = query(listingsCol, where('case_number', '==', caseNumber));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllListings() {
  const snapshot = await getDocs(listingsCol);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribeToListings(callback) {
  return onSnapshot(listingsCol, snapshot => {
    const listings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(listings);
  });
}

export async function getAnalysisByListing(listingId) {
  const q = query(analysisCol, where('listing_id', '==', listingId));
  const snapshot = await getDocs(q);
  return snapshot.docs[0] ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null;
}

export async function addAnalysis(data) {
  return addDoc(analysisCol, {
    ...data,
    created_at: Timestamp.now()
  });
}

export async function addOutreach(data) {
  return addDoc(outreachCol, {
    ...data,
    sent_at: Timestamp.now()
  });
}
