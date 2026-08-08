import React, { useEffect, useState } from 'react';
import { subscribeToListings, getAnalysisByListing } from '../../firebase/client.js';

const PERSONAS = ['wholesaler', 'landlord', 'contractor', 'reit', 'arbitrage'];

export default function App() {
  const [listings, setListings] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToListings(nextListings => {
      setListings(nextListings);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function selectDeal(listingId) {
    setSelectedDeal(listings.find(l => l.id === listingId));
    setAnalysis(null);
    const dealAnalysis = await getAnalysisByListing(listingId);
    setAnalysis(dealAnalysis);
  }

  function formatSaleDate(saleDate) {
    if (!saleDate) return 'TBD';
    const date = saleDate?.toDate ? saleDate.toDate() : new Date(saleDate);
    return isNaN(date.getTime()) ? saleDate : date.toLocaleDateString();
  }

  return (
    <div className="app">
      <header>
        <h1>⚖️ Foreclosure Deal Scanner</h1>
        <p>Multi-perspective analysis from Jud.ct.gov</p>
      </header>

      <main>
        {!selectedDeal ? (
          <section className="listings">
            <h2>Active Listings ({listings.length})</h2>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div className="grid">
                {listings.map(listing => (
                  <div key={listing.id} className="card" onClick={() => selectDeal(listing.id)}>
                    <h3>{listing.property_address}</h3>
                    <p><strong>County:</strong> {listing.property_county}</p>
                    <p><strong>Opening Bid:</strong> ${listing.opening_bid?.toLocaleString() ?? 'N/A'}</p>
                    <p><strong>Sale Date:</strong> {formatSaleDate(listing.sale_date)}</p>
                    <p><strong>Case:</strong> {listing.case_number}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="analysis-detail">
            <button onClick={() => setSelectedDeal(null)}>← Back</button>
            <h2>{selectedDeal.property_address}</h2>

            {analysis ? (
              <>
                <div className="perspectives">
                  {PERSONAS.map(persona => (
                    <div key={persona} className="perspective">
                      <h3>{persona.charAt(0).toUpperCase() + persona.slice(1)}</h3>
                      <p className="score">Score: {analysis[`${persona}_score`] ?? 'N/A'}/100</p>
                      <p>{analysis[`${persona}_summary`] || 'No analysis available'}</p>
                    </div>
                  ))}
                </div>
                <div className="recommendation">
                  <h3>Top Fit: {analysis.top_recommendation || 'N/A'}</h3>
                  <p>Confidence: {((analysis.confidence || 0) * 100).toFixed(0)}%</p>
                </div>
              </>
            ) : (
              <p>Analysis pending...</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
