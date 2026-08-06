import { scrapeJudCtListings, diffListings } from '../src/scraper/jud-ct-scraper.js';
import { analyzeDealMultiPerspective } from '../src/claude/multi-perspective-analysis.js';
import { addListingAdmin, addAnalysisAdmin, getExistingCaseNumbersAdmin } from '../src/firebase/admin.js';

const COUNTIES = ['Hartford', 'Fairfield', 'New Haven', 'New London'];

/**
 * Cloudflare Worker: scheduled trigger (see wrangler.toml `triggers.crons`).
 * Scrapes each county, inserts new listings into Firestore, and kicks off
 * multi-perspective Claude analysis for each new listing.
 */
export default {
  async scheduled(event, env, ctx) {
    console.log('[Scheduler] Starting foreclosure scan...');

    const existingCases = await getExistingCaseNumbersAdmin(env);

    for (const county of COUNTIES) {
      try {
        const scrapedListings = await scrapeJudCtListings(county);
        console.log(`[Scheduler] Scraped ${scrapedListings.length} from ${county}`);

        const { new: newListings } = diffListings(scrapedListings, existingCases);
        console.log(`[Scheduler] Found ${newListings.length} new listings in ${county}`);

        for (const listing of newListings) {
          const savedListing = await addListingAdmin(listing, env);
          existingCases.push(listing.case_number);

          ctx.waitUntil(
            analyzeDealMultiPerspective(listing, null, env.CLAUDE_API_KEY)
              .then(analysis => {
                if (!analysis) return;
                return addAnalysisAdmin(
                  {
                    listing_id: savedListing.id,
                    wholesaler_summary: analysis.analyses.wholesaler?.summary,
                    wholesaler_score: analysis.analyses.wholesaler?.score,
                    landlord_summary: analysis.analyses.landlord?.summary,
                    landlord_score: analysis.analyses.landlord?.score,
                    contractor_summary: analysis.analyses.contractor?.summary,
                    contractor_score: analysis.analyses.contractor?.score,
                    reit_summary: analysis.analyses.reit?.summary,
                    reit_score: analysis.analyses.reit?.score,
                    arbitrage_summary: analysis.analyses.arbitrage?.summary,
                    arbitrage_score: analysis.analyses.arbitrage?.score,
                    top_recommendation: analysis.topRecommendation,
                    confidence: analysis.confidence,
                    analysis_date: analysis.analyzed_at
                  },
                  env
                );
              })
              .then(() => console.log(`[Scheduler] Analysis complete for ${listing.case_number}`))
              .catch(error => console.error(`[Scheduler] Analysis failed for ${listing.case_number}:`, error.message))
          );
        }
      } catch (error) {
        console.error(`[Scheduler] Error processing ${county}:`, error.message);
      }
    }

    console.log('[Scheduler] Scan complete');
  }
};
