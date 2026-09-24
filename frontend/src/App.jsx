import React, { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function App() {
  const [contractAddress, setContractAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  // Quick preset helper for easy hackathon demo testing
  const handlePreset = (address, id) => {
    setContractAddress(address);
    setTokenId(id);
    setError(null);
  };

  const handleAnalyze = async (e) => {
    e?.preventDefault();
    
    // Clear previous state
    setError(null);
    setResults(null);

    // 1. Validation: check that both fields are filled
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

    // 2. Set loading state
    setLoading(true);

    try {
      // 3 & 4. Send POST request with exact expected format to backend /analyze
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

      // 5 & 7. Check HTTP status and handle errors
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(
          `Backend returned error (${response.status}): ${errorText || response.statusText}`
        );
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error('Received an invalid JSON response from the server.');
      }

      // 6. Display returned result
      setResults(data);
    } catch (err) {
      // 7. Network / server unavailable / parsing error handling
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError(
          `Unable to connect to WashGuard backend at ${API_BASE_URL}. Please ensure the backend server is running.`
        );
      } else {
        setError(err.message || 'An unexpected error occurred during analysis.');
      }
    } finally {
      // 8. Always remove loading state when request finishes
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-badge">
          <span className="pulse-dot"></span>
          Blockchain Forensics Active
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

          {/* Presets for fast testing */}
          <div className="preset-section">
            <span className="preset-label">Quick Test Presets:</span>
            <button
              type="button"
              className="preset-btn"
              onClick={() =>
                handlePreset('0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', '1')
              }
            >
              BAYC #1
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
                <span>Analyzing On-Chain Data...</span>
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
      {results && (
        <div className="card results-area">
          <div className="card-title">
            <span>Analysis Results</span>
            {results.status === 'received' && (
              <span className="badge-dev">Development Result</span>
            )}
          </div>

          {/* If backend returns a risk score */}
          {results.risk_score !== undefined ? (
            <div>
              <div className="results-grid">
                <div className="stat-box">
                  <div className="stat-label">Wash-Trading Risk Score</div>
                  <div className="score-display">
                    <span className="score-num">{results.risk_score}</span>
                    <span className="score-total">/ 100</span>
                  </div>
                </div>

                <div className="stat-box">
                  <div className="stat-label">Risk Level</div>
                  <div className="stat-value" style={{ color: getRiskColor(results.risk_level) }}>
                    {results.risk_level || 'Unknown'}
                  </div>
                </div>
              </div>

              <div className="placeholder-section">
                <div className="placeholder-title">Detected Signals</div>
                <div className="placeholder-text">
                  {results.signals?.length
                    ? results.signals.join(', ')
                    : 'No suspicious signals detected.'}
                </div>
              </div>

              <div className="placeholder-section">
                <div className="placeholder-title">Evidence</div>
                <div className="placeholder-text">
                  {results.evidence ? JSON.stringify(results.evidence, null, 2) : 'No evidence recorded.'}
                </div>
              </div>
            </div>
          ) : (
            /* Development Result Display */
            <div>
              <div className="results-grid">
                <div className="stat-box">
                  <div className="stat-label">Wash-Trading Risk Score</div>
                  <div className="score-display">
                    <span className="score-num">--</span>
                    <span className="score-total">/ 100</span>
                  </div>
                </div>

                <div className="stat-box">
                  <div className="stat-label">API Status</div>
                  <div className="stat-value" style={{ color: '#06b6d4' }}>
                    {results.status || 'OK'}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div className="stat-label" style={{ marginBottom: '0.5rem' }}>
                  Backend Response Payload
                </div>
                <pre className="json-box">{JSON.stringify(results, null, 2)}</pre>
              </div>

              <div className="placeholder-section">
                <div className="placeholder-title">Risk Level</div>
                <div className="placeholder-text">Pending Detection Engine Calculation</div>
              </div>

              <div className="placeholder-section">
                <div className="placeholder-title">Detected Signals</div>
                <div className="placeholder-text">Pending Signal Analyzer Integration</div>
              </div>

              <div className="placeholder-section">
                <div className="placeholder-title">Evidence</div>
                <div className="placeholder-text">Pending Evidence Parser Integration</div>
              </div>
            </div>
          )}
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
  switch (level?.toLowerCase()) {
    case 'low': return '#10b981';
    case 'medium': return '#f59e0b';
    case 'high': return '#f97316';
    case 'critical': return '#ef4444';
    default: return '#94a3b8';
  }
}
