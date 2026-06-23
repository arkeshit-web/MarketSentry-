import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, AlertCircle, TrendingUp, TrendingDown, ShieldAlert, Award } from 'lucide-react';
import Sparkline from './Sparkline';

export default function Dashboard({ 
  stocks, 
  lastSync, 
  syncStatus, 
  marketStatus, 
  onSelectStock, 
  onTriggerSync 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState('all'); // all, bullish, neutral, bearish
  const [sortField, setSortField] = useState('score');
  const [sortAsc, setSortAsc] = useState(false);

  // Filter and Sort stocks
  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = 
      stock.ticker.toLowerCase().includes(searchTerm.toLowerCase()) || 
      stock.name.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (scoreFilter === 'all') return matchesSearch;
    if (scoreFilter === 'bullish') return matchesSearch && stock.score >= 70;
    if (scoreFilter === 'neutral') return matchesSearch && stock.score >= 40 && stock.score < 70;
    if (scoreFilter === 'bearish') return matchesSearch && stock.score < 40;
    return matchesSearch;
  });

  const sortedStocks = [...filteredStocks].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    
    // Handle potential missing values
    if (valA === undefined || valA === null) valA = 0;
    if (valB === undefined || valB === null) valB = 0;
    
    if (typeof valA === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortAsc ? valA - valB : valB - valA;
  });

  const requestSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getScoreClass = (score) => {
    if (score >= 70) return 'score-high';
    if (score < 40) return 'score-low';
    return 'score-mid';
  };

  const getScoreLabel = (score) => {
    if (score >= 70) return 'Bullish';
    if (score < 40) return 'Bearish';
    return 'Neutral';
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 80px 20px' }}>
      {/* Header Panel */}
      <div className="glass-panel glass-panel-glow dashboard-header" style={{ marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #ffffff 30%, var(--color-text-secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              MarketSentry
            </span>
            <span style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, #a78bfa 100%)', color: 'var(--bg-main)', fontSize: '0.85rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              v2.0
            </span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 4, fontSize: '0.95rem' }}>
            Multi-Algorithmic Real-Time Predictor & Sentiment Analyzer for Nifty 50
          </p>
        </div>

        {/* Market Status Row */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {marketStatus && (
            <>
              {/* Nifty Index */}
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.08)', paddingLeft: 16 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Nifty 50 Index
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {marketStatus.nifty?.price ? marketStatus.nifty.price.toLocaleString('en-IN') : '23,500.00'}
                  </span>
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    fontSize: '0.85rem', 
                    fontWeight: 600,
                    color: marketStatus.nifty?.change_pct >= 0 ? 'var(--color-bullish)' : 'var(--color-bearish)' 
                  }}>
                    {marketStatus.nifty?.change_pct >= 0 ? <TrendingUp size={14} style={{ marginRight: 2 }} /> : <TrendingDown size={14} style={{ marginRight: 2 }} />}
                    {marketStatus.nifty?.change_pct ? `${marketStatus.nifty.change_pct > 0 ? '+' : ''}${marketStatus.nifty.change_pct.toFixed(2)}%` : '0.00%'}
                  </span>
                </div>
              </div>

              {/* India VIX */}
              <div style={{ borderLeft: '2px solid rgba(255,255,255,0.08)', paddingLeft: 16 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  India VIX
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {marketStatus.vix ? marketStatus.vix.toFixed(2) : '14.50'}
                  </span>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 600, 
                    color: marketStatus.vix <= 15 ? 'var(--color-bullish)' : marketStatus.vix > 20 ? 'var(--color-bearish)' : 'var(--color-neutral)',
                    background: marketStatus.vix <= 15 ? 'var(--color-bullish-glow)' : marketStatus.vix > 20 ? 'var(--color-bearish-glow)' : 'var(--color-neutral-glow)',
                    padding: '2px 6px',
                    borderRadius: 4
                  }}>
                    {marketStatus.vix <= 15 ? 'Stable' : marketStatus.vix > 20 ? 'Elevated Risk' : 'Normal'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sync Control & Data Info */}
      <div className="glass-panel sync-control-panel" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Last Database Sync: <strong style={{ color: 'var(--color-text-primary)' }}>{lastSync} IST</strong>
          </span>
          {syncStatus.is_syncing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="pulse-glow" style={{ fontSize: '0.85rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                Synchronizing ({syncStatus.progress}/{syncStatus.total})...
              </span>
              <div style={{ width: 120, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ 
                  width: `${(syncStatus.progress / syncStatus.total) * 100}%`, 
                  height: '100%', 
                  background: 'var(--color-accent)',
                  transition: 'width 0.3s ease-out'
                }}></div>
              </div>
            </div>
          )}
        </div>

        <button 
          className="glass-btn glass-btn-primary" 
          onClick={onTriggerSync}
          disabled={syncStatus.is_syncing}
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          <RefreshCw size={14} className={syncStatus.is_syncing ? "animate-spin" : ""} />
          {syncStatus.is_syncing ? "Syncing Stock Data..." : "Run Global Live Update"}
        </button>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="toolbar-container">
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            className="glass-input"
            placeholder="Search Nifty 50 stocks by name or symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: 42 }}
          />
        </div>

        {/* Score Category Filter */}
        <div className="filter-button-group">
          <button 
            className={`glass-btn ${scoreFilter === 'all' ? 'glass-btn-primary' : ''}`}
            onClick={() => setScoreFilter('all')}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            All Stocks ({stocks.length})
          </button>
          <button 
            className={`glass-btn ${scoreFilter === 'bullish' ? 'glass-btn-primary' : ''}`}
            onClick={() => setScoreFilter('bullish')}
            style={{ 
              padding: '8px 14px', 
              fontSize: '0.85rem',
              borderColor: scoreFilter === 'bullish' ? 'none' : 'rgba(16, 185, 129, 0.2)',
              color: scoreFilter === 'bullish' ? '#fff' : 'var(--color-bullish)'
            }}
          >
            Bullish (≥70)
          </button>
          <button 
            className={`glass-btn ${scoreFilter === 'neutral' ? 'glass-btn-primary' : ''}`}
            onClick={() => setScoreFilter('neutral')}
            style={{ 
              padding: '8px 14px', 
              fontSize: '0.85rem',
              borderColor: scoreFilter === 'neutral' ? 'none' : 'rgba(245, 158, 11, 0.2)',
              color: scoreFilter === 'neutral' ? '#fff' : 'var(--color-neutral)'
            }}
          >
            Neutral (40-69)
          </button>
          <button 
            className={`glass-btn ${scoreFilter === 'bearish' ? 'glass-btn-primary' : ''}`}
            onClick={() => setScoreFilter('bearish')}
            style={{ 
              padding: '8px 14px', 
              fontSize: '0.85rem',
              borderColor: scoreFilter === 'bearish' ? 'none' : 'rgba(239, 68, 68, 0.2)',
              color: scoreFilter === 'bearish' ? '#fff' : 'var(--color-bearish)'
            }}
          >
            Bearish (&lt;40)
          </button>
        </div>
      </div>

      {/* Stocks Table Panel */}
      <div className="glass-panel glass-panel-glow" style={{ overflowX: 'auto', marginBottom: 60 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 700 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th onClick={() => requestSort('ticker')} style={{ padding: '16px 24px', cursor: 'pointer', userSelect: 'none' }}>
                Company {sortField === 'ticker' && (sortAsc ? '▲' : '▼')}
              </th>
              <th onClick={() => requestSort('price')} style={{ padding: '16px 20px', cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}>
                Price {sortField === 'price' && (sortAsc ? '▲' : '▼')}
              </th>
              <th onClick={() => requestSort('change_pct')} style={{ padding: '16px 20px', cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}>
                24h Change {sortField === 'change_pct' && (sortAsc ? '▲' : '▼')}
              </th>
              <th className="hide-mobile" style={{ padding: '16px 20px', textAlign: 'center' }}>
                Last 15 Days Trend
              </th>
              <th onClick={() => requestSort('score')} style={{ padding: '16px 24px', cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}>
                Composite Score {sortField === 'score' && (sortAsc ? '▲' : '▼')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStocks.length > 0 ? (
              sortedStocks.map((stock) => (
                <tr 
                  key={stock.ticker}
                  onClick={() => onSelectStock(stock.ticker)}
                  className="stock-row"
                  style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.04)', 
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  {/* Company */}
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{stock.ticker.replace('.NS', '')}</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginTop: 2 }}>{stock.name}</div>
                  </td>
                  
                  {/* Price */}
                  <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrency(stock.price)}
                  </td>
                  
                  {/* Change */}
                  <td style={{ 
                    padding: '16px 20px', 
                    textAlign: 'right', 
                    fontWeight: 700,
                    color: stock.change_pct >= 0 ? 'var(--color-bullish)' : 'var(--color-bearish)'
                  }}>
                    {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%
                  </td>
                  
                  {/* Sparkline */}
                  <td className="hide-mobile" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Sparkline prices={stock.history} />
                  </td>
                  
                  {/* Score */}
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <span className={`score-badge ${getScoreClass(stock.score)}`} style={{ padding: '6px 12px', fontSize: '0.9rem' }}>
                      <Award size={14} style={{ marginRight: 2 }} />
                      {stock.score}
                      <span className="hide-mobile-inline" style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.8, marginLeft: 4 }}>
                        ({getScoreLabel(stock.score)})
                      </span>
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <AlertCircle size={24} />
                    <span>No stocks match your search criteria.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Styled css injection for table row hover states */}
      <style>{`
        .stock-row:hover {
          background: rgba(255, 255, 255, 0.02) !important;
          transform: scale(1.002);
        }
        .stock-row:hover td {
          color: #fff;
        }
      `}</style>

      {/* DESIGNER FOOTER */}
      <footer style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '40px 0 20px 0',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="designer-text">MarketSentry 2.0</span>
          <div style={{ width: 1, height: 16, background: 'rgba(255, 255, 255, 0.15)' }}></div>
          <span className="designer-text">Trading Intelligence Engine</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span className="designer-text" style={{ fontSize: '1rem', opacity: 0.8 }}>Designed by</span>
          <span className="designer-name">Arkesh Baidya</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 8, letterSpacing: '0.05em' }}>
          &copy; {new Date().getFullYear()} MarketSentry. All intellectual property rights reserved.
        </span>
      </footer>
    </div>
  );
}
