import React, { useState } from 'react';
import WalletGraph from './components/WalletGraph';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function App() {
  const [contractAddress, setContractAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const handlePreset = (address, id) => {
    setContractAddress(address);
    setTokenId(id);
    setError(null);
  };

  const handleAnalyze = async (e) => {
    e?.preventDefault();
    
    setError(null);
    setResults(null);

    const trimmedAddress = contractAddress.trim();
    const trimmedTokenId = tokenId.trim();

    if (!trimmedAddress || !trimmedTokenId) {
      if (!trimmedAddress && !trimmedTokenId) {
        setError('Please enter an NFT Contract Address and Token ID.');
      } else if (!trimmedAddress) {
        setError('NFT Contract Address is required.');
      } else {
        setError('Token ID is required.');
      }
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contract_address: trimmedAddress,
          token_id: trimmedTokenId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMsg = errorData?.detail || `Backend error (${response.status})`;
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError(
          `Unable to connect to WashGuard backend at ${API_BASE_URL}. Please ensure the backend server is running.`
        );
      } else {
        setError(err.message || 'An unexpected error occurred during analysis.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-badge">
          <span className="pulse-dot"></span>
          Wallet Graph Forensics Enabled
        </div>
        <h1 className="header-title">WASHGUARD</h1>
        <p className="header-subtitle">NFT Wash-Trading Risk Analyzer</p>
      </header>

      {/* Input Card */}
      <div className="card">
        <div className="card-title">
          <span>NFT Inspection Parameters</span>
        </div>

        <form onSubmit={handleAnalyze}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="contract-address">
                NFT Contract Address
              </label>
              <div className="input-wrapper">
                <input
                  id="contract-address"
                  type="text"
                  className="form-input"
                  placeholder="e.g. 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="token-id">
                Token ID
              </label>
              <div className="input-wrapper">
                <input
                  id="token-id"
                  type="text"
                  className="form-input"
                  placeholder="e.g. 1"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="preset-section">
            <span className="preset-label">Quick Test Presets:</span>
            <button
              type="button"
              className="preset-btn"
              onClick={() =>
                handlePreset('0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', '1')
              }
            >
              BAYC #1 (High Wash Pattern)
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() =>
                handlePreset('0xED5AF3B7828476C17F56A6376557565402756193', '8888')
              }
            >
              AZUKI #8888
            </button>
          </div>

          {/* Analyze Button */}
          <button
            type="submit"
            className="btn-analyze"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                <span>Analyzing Network Topology & Wash Signals...</span>
              </>
            ) : (
              <span>ANALYZE NFT</span>
            )}
          </button>
        </form>

        {/* User-friendly Error Display */}
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Results Area */}
      {results && results.risk_score !== undefined && (
        <div className="card results-area">
          <div className="card-title">
            <span>Wash-Trading Analysis Results</span>
            <span className="badge-dev" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', borderColor: 'rgba(6, 182, 212, 0.4)' }}>
              Deterministic Engine v1.0
            </span>
          </div>

          {/* Top Score Banner */}
          <div className="results-grid">
            <div className="stat-box" style={{ borderColor: getRiskColor(results.risk_level) }}>
              <div className="stat-label">Wash-Trading Risk Score</div>
              <div className="score-display">
                <span className="score-num" style={{ color: getRiskColor(results.risk_level) }}>
                  {results.risk_score}
                </span>
                <span className="score-total">/ 100</span>
              </div>
            </div>

            <div className="stat-box" style={{ borderColor: getRiskColor(results.risk_level) }}>
              <div className="stat-label">Risk Level</div>
              <div className="stat-value" style={{ color: getRiskColor(results.risk_level), fontSize: '1.2rem' }}>
                {results.risk_level}
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-label">Transfers Analyzed</div>
              <div className="stat-value" style={{ color: '#06b6d4' }}>
                {results.total_transfers_found ?? 0}
              </div>
            </div>
          </div>

          {/* OpenSea Market Data Section */}
          <div className="placeholder-section" style={{ marginBottom: '1.25rem', borderColor: 'rgba(59, 130, 246, 0.4)', background: 'rgba(59, 130, 246, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div className="placeholder-title" style={{ color: '#3b82f6', margin: 0 }}>OpenSea Market Context</div>
              {results.market_data?.is_available ? (
                <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: '600' }}>
                  Market Context Active
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(148, 163, 184, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  Market data unavailable
                </span>
              )}
            </div>

            {results.market_data?.is_available ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Collection</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f8fafc' }}>
                    {results.market_data.collection?.name || 'Unknown'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Floor Price</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#3b82f6' }}>
                    {results.market_data.floor_price !== null && results.market_data.floor_price !== undefined
                      ? `${results.market_data.floor_price} ${results.market_data.currency || 'ETH'}`
                      : 'N/A'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Recorded Sales</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#10b981' }}>
                    {results.market_data.sales?.length ?? 0} Sales
                  </div>
                </div>
              </div>
            ) : (
              <div className="placeholder-text" style={{ color: '#94a3b8' }}>
                OpenSea market context is currently unavailable or unconfigured. (Analysis continues using Alchemy on-chain transfer data).
              </div>
            )}
          </div>

          {/* Interactive Wallet Network Graph */}
          <div className="placeholder-section" style={{ marginBottom: '1.25rem', borderColor: 'rgba(6, 182, 212, 0.4)', background: 'rgba(6, 182, 212, 0.03)' }}>
            <div className="placeholder-title" style={{ color: '#06b6d4', marginBottom: '0.25rem' }}>
              Interactive Wallet Transaction Graph
            </div>
            <div className="placeholder-text" style={{ color: '#94a3b8', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
              Visualizing wallet interactions, directed transfer paths, circular trading loops, and transaction values.
            </div>

            <WalletGraph 
              transfers={results.normalized_transfers} 
              signals={results.signals} 
            />
          </div>

          {/* Disclaimer Banner */}
          {results.disclaimer && (
            <div className="placeholder-section" style={{ marginBottom: '1.25rem', borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)' }}>
              <div className="placeholder-title" style={{ color: '#fbbf24' }}>Legal & Heuristic Notice</div>
              <div className="placeholder-text" style={{ color: '#e2e8f0' }}>{results.disclaimer}</div>
            </div>
          )}

          {/* Detected Signals Section */}
          <div className="placeholder-section" style={{ marginBottom: '1.5rem' }}>
            <div className="placeholder-title" style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>
              Detected Signals Breakdown
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {results.signals?.map((sig, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    background: sig.detected ? 'rgba(239, 68, 68, 0.08)' : 'rgba(15, 23, 42, 0.5)',
                    border: `1px solid ${sig.detected ? 'rgba(239, 68, 68, 0.4)' : 'rgba(51, 65, 85, 0.4)'}`,
                    borderRadius: '10px',
                    padding: '0.9rem 1.1rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: '700', color: sig.detected ? '#fca5a5' : '#94a3b8', fontSize: '0.95rem' }}>
                      {sig.detected ? '🚨' : '⚪'} {sig.name}
                    </span>
                    <span style={{ 
                      fontSize: '0.8rem', 
                      fontFamily: 'var(--font-mono)',
                      fontWeight: '700',
                      color: sig.detected ? '#ef4444' : '#64748b',
                      background: sig.detected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px'
                    }}>
                      {sig.score} / {sig.max_score} pts
                    </span>
                  </div>

                  <ul style={{ margin: 0, paddingLeft: '1.2rem', color: sig.detected ? '#f8fafc' : '#64748b', fontSize: '0.85rem' }}>
                    {sig.evidence?.map((ev, evIdx) => (
                      <li key={evIdx} style={{ marginBottom: '0.2rem' }}>{ev}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Normalized Transfer Activity Table */}
          <div className="placeholder-section">
            <div className="placeholder-title" style={{ marginBottom: '0.75rem' }}>Raw Blockchain Transfer Evidence</div>
            {results.normalized_transfers && results.normalized_transfers.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.5rem' }}>Tx Hash</th>
                      <th style={{ padding: '0.5rem' }}>From Address</th>
                      <th style={{ padding: '0.5rem' }}>To Address</th>
                      <th style={{ padding: '0.5rem' }}>Timestamp</th>
                      <th style={{ padding: '0.5rem' }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.normalized_transfers.map((tx, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.3)' }}>
                        <td style={{ padding: '0.5rem', color: '#06b6d4' }}>
                          {tx.tx_hash ? `${tx.tx_hash.slice(0, 10)}...${tx.tx_hash.slice(-6)}` : 'N/A'}
                        </td>
                        <td style={{ padding: '0.5rem', color: '#94a3b8' }}>
                          {tx.from ? `${tx.from.slice(0, 6)}...${tx.from.slice(-4)}` : 'N/A'}
                        </td>
                        <td style={{ padding: '0.5rem', color: '#94a3b8' }}>
                          {tx.to ? `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}` : 'N/A'}
                        </td>
                        <td style={{ padding: '0.5rem', color: '#e2e8f0' }}>
                          {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'N/A'}
                        </td>
                        <td style={{ padding: '0.5rem', color: '#10b981', fontWeight: 'bold' }}>
                          {tx.value !== null && tx.value !== undefined ? `${tx.value} ETH` : 'Transfer (0 ETH)'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="placeholder-text">No transfer activity recorded for this token.</div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        WashGuard Hackathon MVP — NFT Wash-Trading Risk Analyzer
      </footer>
    </div>
  );
}

function getRiskColor(level) {
  switch (level?.toUpperCase()) {
    case 'LOW WASH-TRADING RISK': return '#10b981';
    case 'SUSPICIOUS ACTIVITY': return '#f59e0b';
    case 'HIGH WASH-TRADING RISK': return '#ef4444';
    default: return '#94a3b8';
  }
}
