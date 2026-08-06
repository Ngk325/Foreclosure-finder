import * as cheerio from 'cheerio';

const JUD_CT_BASE_URL = 'https://www.jud.ct.gov/foreclosure_sales/';

/**
 * Scrape Jud.ct.gov foreclosure listings for a county.
 *
 * NOTE: the table selectors below are a starting point, not verified
 * against the live site — jud.ct.gov's markup should be inspected and
 * these selectors adjusted before relying on this in production.
 */
export async function scrapeJudCtListings(county = 'Hartford') {
  try {
    const url = `${JUD_CT_BASE_URL}?county=${encodeURIComponent(county)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; foreclosure-scanner/1.0)'
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    const listings = [];

    $('table tbody tr').each((i, elem) => {
      const row = $(elem);
      const caseNumber = row.find('td:nth-child(1)').text().trim();
      const address = row.find('td:nth-child(2)').text().trim();
      const plaintiff = row.find('td:nth-child(3)').text().trim();
      const defendant = row.find('td:nth-child(4)').text().trim();
      const attorney = row.find('td:nth-child(5)').text().trim();
      const openingBidText = row.find('td:nth-child(6)').text().trim().replace(/[$,]/g, '');
      const openingBid = parseFloat(openingBidText);
      const saleDate = row.find('td:nth-child(7)').text().trim();

      if (caseNumber && address) {
        listings.push({
          case_number: caseNumber,
          property_address: address,
          plaintiff,
          defendant,
          attorney_name: attorney.split(',')[0]?.trim() || null,
          attorney_firm: attorney.split(',')[1]?.trim() || null,
          opening_bid: isNaN(openingBid) ? null : openingBid,
          sale_date: saleDate,
          property_county: county
        });
      }
    });

    console.log(`[scraper] Scraped ${listings.length} listings from ${county}`);
    return listings;
  } catch (error) {
    console.error('[scraper] Error:', error.message);
    return [];
  }
}

/** Diff freshly scraped listings against known case numbers. */
export function diffListings(scrapedListings, existingCaseNumbers) {
  const existingSet = new Set(existingCaseNumbers);
  const newListings = scrapedListings.filter(l => !existingSet.has(l.case_number));

  return { new: newListings, updated: [], deleted: [] };
}
