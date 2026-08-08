import 'dotenv/config';
import { analyzeDealMultiPerspective } from '../src/claude/multi-perspective-analysis.js';

if (!process.env.CLAUDE_API_KEY) {
  console.error('Set CLAUDE_API_KEY in .env.local before running this script.');
  process.exit(1);
}

const sampleListing = {
  case_number: 'HHD-CV-24-6012345-S',
  property_address: '123 Main St, Hartford, CT 06103',
  property_county: 'Hartford',
  opening_bid: 185000,
  sale_date: '2026-09-15',
  attorney_name: 'Jane Doe'
};

const sampleProperty = {
  estimated_arv: 260000,
  assessed_value: 210000,
  lien_count: 1,
  property_type: 'Single Family',
  bedrooms: 3,
  bathrooms: 1.5,
  sqft: 1450,
  year_built: 1962
};

console.log('Running multi-perspective analysis on a sample deal...\n');

const analysis = await analyzeDealMultiPerspective(sampleListing, sampleProperty);

console.log(JSON.stringify(analysis, null, 2));
