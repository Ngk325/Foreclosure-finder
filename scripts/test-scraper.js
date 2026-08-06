import 'dotenv/config';
import { scrapeJudCtListings } from '../src/scraper/jud-ct-scraper.js';

const county = process.argv[2] || 'Hartford';

const listings = await scrapeJudCtListings(county);

console.log(`\nScraped ${listings.length} listing(s) for ${county}:\n`);
console.log(JSON.stringify(listings.slice(0, 5), null, 2));
