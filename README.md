# Foreclosure Deal Scanner — Firebase Edition

MVP foreclosure deal pipeline: scrape Jud.ct.gov foreclosure listings, store them in
Firebase Firestore, run 5-perspective Claude analysis on each new deal (wholesaler,
landlord, contractor, REIT, arbitrage), and browse results in a React dashboard.

- **Scraper**: `src/scraper/jud-ct-scraper.js` — parses Jud.ct.gov listing tables.
- **Storage**: Firebase Firestore (`listings`, `properties`, `attorney_contacts`,
  `outreach_log`, `analysis` collections).
- **Analysis**: `src/claude/multi-perspective-analysis.js` — calls the Claude API once
  per investor persona (`src/claude/prompts.js`) and scores each deal 0–100.
- **Scheduler**: `workers/scheduler.js` — a Cloudflare Worker Cron Trigger that scrapes,
  diffs against Firestore, and kicks off analysis for new listings.
- **Dashboard**: `src/dashboard/` — a Vite + React app with a live Firestore subscription.

## Prerequisites

- Node.js 18+
- A Firebase project with Firestore enabled (production mode)
- A Cloudflare account (for the Worker + Pages deploy)
- An Anthropic API key

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Firebase + Claude values
```

### 1. Firebase

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Firestore Database** in production mode.
3. Deploy `firestore.rules` (Firestore Console → Rules, or `firebase deploy --only firestore:rules`
   if you use the Firebase CLI). Client reads are public in this MVP; all writes go through
   the Worker's service-account credentials, not the browser SDK — see the caveat below.
4. Project Settings → General → your web app config → copy the `VITE_FIREBASE_*` values into
   `.env.local`.
5. Project Settings → Service Accounts → **Generate new private key** → save the JSON. You'll
   need it as a Worker secret (`FIREBASE_SERVICE_ACCOUNT_JSON`), not in `.env.local`.
6. Create these composite indexes in the Firestore console (or let Firestore prompt you the
   first time a query needs one):
   - `listings` → `case_number` (ascending)
   - `listings` → `property_county` (ascending)
   - `listings` → `created_at` (descending)
   - `analysis` → `listing_id` (ascending)

### 2. Claude API

Get a key from the [Anthropic Console](https://console.anthropic.com) and set
`CLAUDE_API_KEY` in `.env.local`.

### 3. Try it locally

```bash
npm run test:scraper       # scrape one county, print results
npm run test:claude        # run 5-perspective analysis on a sample deal
npm run dev:dashboard      # dashboard dev server (reads .env.local via envDir)
```

The scraper's CSS selectors (`src/scraper/jud-ct-scraper.js`) are a starting point — verify
them against jud.ct.gov's current markup before relying on them.

### 4. Deploy the Worker (weekly scan)

```bash
npm install -g wrangler   # or use npx wrangler
wrangler login

cd workers
wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON   # paste the full service-account JSON
wrangler secret put CLAUDE_API_KEY
wrangler deploy
```

Edit `FIREBASE_PROJECT_ID` in `workers/wrangler.toml` and the cron schedule
(`triggers.crons`, default: Tuesdays 6 AM UTC) before deploying.

### 5. Deploy the dashboard

```bash
npm run build:dashboard
wrangler pages deploy src/dashboard/dist
```

Set the `VITE_FIREBASE_*` variables as Pages environment variables (Cloudflare dashboard →
Pages project → Settings → Environment variables) so the production build has them at
build time.

## Security note

This MVP dashboard reads Firestore directly from the browser with no auth layer, so
`firestore.rules` allows public reads. Attorney contact info and outreach logs live in the
same database — if this goes beyond personal/internal use, add Firebase Auth and scope
reads before deploying somewhere public.

## Cost

| Item | Cost |
|------|------|
| Firebase Firestore (free tier: 1 GiB storage, 50K reads/day) | $0–10/mo |
| Cloudflare Workers (free tier: 100K requests/day) | $0 |
| Cloudflare Pages | $0 |
| Claude API (~50 deals/month × 5 perspectives) | ~$5/mo |
