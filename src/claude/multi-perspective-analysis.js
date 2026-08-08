import Anthropic from '@anthropic-ai/sdk';
import { INVESTOR_PROMPTS } from './prompts.js';

const MODEL = 'claude-sonnet-5';

/**
 * Analyze a foreclosure deal from 5 investor perspectives in parallel.
 *
 * `apiKey` must be passed explicitly by callers running outside plain
 * Node (e.g. the Cloudflare Worker, which gets secrets via `env` rather
 * than `process.env`). Node scripts may omit it and rely on the SDK's
 * default `process.env.ANTHROPIC_API_KEY` / CLAUDE_API_KEY fallback.
 */
export async function analyzeDealMultiPerspective(listing, propertyData, apiKey) {
  const dealContext = buildDealContext(listing, propertyData);
  const client = new Anthropic({
    apiKey: apiKey || process.env.CLAUDE_API_KEY
  });

  try {
    const personas = Object.entries(INVESTOR_PROMPTS);

    const results = await Promise.all(
      personas.map(async ([persona, systemPrompt]) => {
        const message = await client.messages.create({
          model: MODEL,
          max_tokens: 600,
          temperature: 0.7,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `Analyze this foreclosure deal:\n\n${dealContext}\n\nProvide: (1) fit assessment, (2) key risks/opportunities, (3) deal score (0-100).`
            }
          ]
        });

        const responseText = message.content[0]?.type === 'text' ? message.content[0].text : '';
        const scoreMatch = responseText.match(/Score[:\s]+(\d+)/i);
        const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 0;

        return [persona, { summary: responseText, score }];
      })
    );

    const analyses = Object.fromEntries(results);

    let topRecommendation = null;
    let topScore = 0;
    for (const [persona, { score }] of results) {
      if (score > topScore) {
        topScore = score;
        topRecommendation = persona;
      }
    }

    return {
      analyses,
      topRecommendation,
      topScore,
      confidence: topScore / 100,
      analyzed_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('[analyzeDeal] Error:', error.message);
    return null;
  }
}

function buildDealContext(listing, propertyData) {
  return `
**Property:** ${listing.property_address}
**County:** ${listing.property_county}
**Case:** ${listing.case_number}

**Financial:**
- Opening Bid: $${listing.opening_bid?.toLocaleString() || 'N/A'}
- Estimated ARV: $${propertyData?.estimated_arv?.toLocaleString() || 'N/A'}
- Assessed Value: $${propertyData?.assessed_value?.toLocaleString() || 'N/A'}
- Liens: ${propertyData?.lien_count || 0}

**Property:**
- Type: ${propertyData?.property_type || 'Unknown'}
- Beds/Baths: ${propertyData?.bedrooms || '?'}/${propertyData?.bathrooms || '?'}
- Sq Ft: ${propertyData?.sqft?.toLocaleString() || 'N/A'}
- Year Built: ${propertyData?.year_built || 'Unknown'}

**Sale:**
- Date: ${listing.sale_date || 'TBD'}
- Attorney: ${listing.attorney_name || 'Unknown'}
  `;
}
