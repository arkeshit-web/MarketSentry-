import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import StockDetails from './components/StockDetails';
import { ShieldAlert, AlertCircle, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export default function App() {
  const [stocks, setStocks] = useState([]);
  const [lastSync, setLastSync] = useState('Never');
  const [syncStatus, setSyncStatus] = useState({ is_syncing: false, progress: 0, total: 50 });
  const [marketStatus, setMarketStatus] = useState({ nifty: { price: 23500.0, change_pct: 0.0 }, vix: 14.50 });
  
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [selectedStockDetail, setSelectedStockDetail] = useState(null);
  const [intradayData, setIntradayData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState(null);

  // Fetch initial stocks and market indices
  const fetchStocks = async () => {
    try {
      const res = await fetch(`${API_BASE}/stocks`);
      if (res.ok) {
        const data = await res.json();
        setStocks(data.stocks || []);
        setLastSync(data.last_sync || 'Never');
        if (data.sync_status) {
          setSyncStatus(data.sync_status);
        }
      } else {
        throw new Error("Failed to load stock list from backend API.");
      }
    } catch (err) {
      console.error(err);
      setError("Cannot connect to backend server. Make sure the FastAPI application is running on port 8000.");
    }
  };

  const fetchMarketStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/market-status`);
      if (res.ok) {
        const data = await res.json();
        setMarketStatus(data);
      }
    } catch (err) {
      console.error("Failed to load market status:", err);
    }
  };

  // Trigger Nifty 50 sync
  const triggerSync = async () => {
    try {
      const res = await fetch(`${API_BASE}/stocks/sync`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data.status);
        setError(null);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to start synchronization. API server could be offline.");
    }
  };

  // Poll sync status when syncing
  useEffect(() => {
    let timer;
    if (syncStatus.is_syncing) {
      timer = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/sync/status`);
          if (res.ok) {
            const status = await res.json();
            setSyncStatus(status);
            
            // If sync completed, refresh the stock list
            if (!status.is_syncing) {
              fetchStocks();
              fetchMarketStatus();
            }
          }
        } catch (err) {
          console.error("Error polling sync status:", err);
        }
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [syncStatus.is_syncing]);

  // Fetch Intraday 1-day prices
  const fetchIntraday = async (ticker) => {
    try {
      const res = await fetch(`${API_BASE}/stocks/${ticker}/intraday`);
      if (res.ok) {
        const data = await res.json();
        setIntradayData(data);
      }
    } catch (err) {
      console.error("Failed to fetch intraday data:", err);
    }
  };

  // Poll Intraday data every 30 seconds when a stock page is open
  useEffect(() => {
    let timer;
    if (selectedTicker) {
      fetchIntraday(selectedTicker);
      timer = setInterval(() => {
        fetchIntraday(selectedTicker);
      }, 30000); // 30 seconds
    } else {
      setIntradayData(null);
    }
    return () => clearInterval(timer);
  }, [selectedTicker]);

  // Handle stock click
  const selectStock = async (ticker) => {
    setSelectedTicker(ticker);
    setLoadingDetails(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/stocks/${ticker}`);
      if (res.ok) {
        const detail = await res.json();
        setSelectedStockDetail(detail);
      } else {
        throw new Error(`Failed to load details for ${ticker}`);
      }
    } catch (err) {
      console.error(err);
      setError(`Unable to retrieve live statistics for ${ticker}. Checking database cache connection.`);
      setSelectedTicker(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStocks();
    fetchMarketStatus();
    
    // Refresh market statuses every 60 seconds
    const interval = setInterval(() => {
      fetchMarketStatus();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Global Error Banner */}
      {error && (
        <div style={{ 
          background: 'var(--color-bearish-glow)', 
          borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#fff',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12,
          fontSize: '0.9rem',
          zIndex: 1000
        }}>
          <AlertCircle size={18} style={{ color: 'var(--color-bearish)' }} />
          <span>{error}</span>
          <button 
            className="glass-btn" 
            onClick={() => { setError(null); fetchStocks(); fetchMarketStatus(); }}
            style={{ padding: '4px 10px', fontSize: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, paddingBottom: 40 }}>
        {loadingDetails ? (
          <div style={{ 
            height: '80vh', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--color-text-secondary)'
          }}>
            <RefreshCw className="animate-spin" size={48} style={{ color: 'var(--color-accent)', marginBottom: 20 }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Analyzing {selectedTicker?.replace('.NS', '')} Market Parameters...</h3>
            <p style={{ color: 'var(--color-text-muted)', marginTop: 8, fontSize: '0.9rem' }}>
              Re-evaluating historical charts, training ML predictors, and scraping sentiment feeds.
            </p>
          </div>
        ) : selectedStockDetail ? (
          <StockDetails
            ticker={selectedStockDetail.ticker}
            name={selectedStockDetail.name}
            price={selectedStockDetail.price}
            changePct={selectedStockDetail.change_pct}
            detail={selectedStockDetail}
            intradayData={intradayData}
            onBack={() => { setSelectedStockDetail(null); setSelectedTicker(null); fetchStocks(); }}
          />
        ) : (
          <Dashboard
            stocks={stocks}
            lastSync={lastSync}
            syncStatus={syncStatus}
            marketStatus={marketStatus}
            onSelectStock={selectStock}
            onTriggerSync={triggerSync}
          />
        )}
      </main>
    </div>
  );
}
