import React, { useState } from 'react';
import { ArrowLeft, BookOpen, AlertTriangle, Cpu, TrendingUp, TrendingDown, Activity, Globe, MessageSquare } from 'lucide-react';
import ScoreGauge from './ScoreGauge';

const formatToIST = (dateStr) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date) + ' IST';
  } catch (e) {
    return dateStr;
  }
};

export default function StockDetails({ ticker, name, price, changePct, detail, onBack }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!detail || !detail.detailed) {
    return (
      <div style={{ maxWidth: 800, margin: '100px auto', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <Activity className="animate-spin" size={40} style={{ color: 'var(--color-accent)', marginBottom: 20 }} />
        <h3>Loading Real-Time Quantitative Analytics...</h3>
      </div>
    );
  }

  const { detailed, score, tech_score, ml_score, sent_score, vol_score } = detail;
  const tech = detailed.technical_indicators || {};
  const ml = detailed.ml_prediction || {};
  const sent = detailed.sentiment || {};
  const news = detailed.news || [];
  const vol = detailed.volatility || {};
  const priceHistory = detailed.price_history || [];
  const dates = detailed.dates || [];

  const getScoreColor = (val, max) => {
    const pct = val / max;
    if (pct >= 0.7) return 'var(--color-bullish)';
    if (pct < 0.4) return 'var(--color-bearish)';
    return 'var(--color-neutral)';
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  // Render SVG Area Chart for 30 Days price history
  const renderHistoryChart = () => {
    if (priceHistory.length < 2) return null;
    
    const width = 600;
    const height = 200;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;
    
    const minVal = Math.min(...priceHistory);
    const maxVal = Math.max(...priceHistory);
    const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;
    
    // Add 5% padding to top and bottom of chart
    const minChartVal = minVal - valRange * 0.05;
    const maxChartVal = maxVal + valRange * 0.05;
    const chartRange = maxChartVal - minChartVal;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    
    const points = priceHistory.map((val, idx) => {
      const x = paddingLeft + (idx / (priceHistory.length - 1)) * chartWidth;
      const y = paddingTop + ((maxChartVal - val) / chartRange) * chartHeight;
      return { x, y, val, date: dates[idx] || '' };
    });
    
    const pathD = points.reduce((acc, pt, idx) => {
      return acc + (idx === 0 ? `M ${pt.x} ${pt.y}` : ` L ${pt.x} ${pt.y}`);
    }, "");

    const fillD = `${pathD} L ${width - paddingRight} ${height - paddingBottom} L ${paddingLeft} ${height - paddingBottom} Z`;
    
    const strokeColor = changePct >= 0 ? 'var(--color-bullish)' : 'var(--color-bearish)';
    const gradId = 'chart-grad';

    // Generates Y axis gridlines and labels (3 lines)
    const yGrid = [0.1, 0.5, 0.9].map(ratio => {
      const val = maxChartVal - ratio * chartRange;
      const y = paddingTop + ratio * chartHeight;
      return { y, val };
    });

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {/* Y Axis Gridlines and Labels */}
        {yGrid.map((grid, i) => (
          <g key={i}>
            <line 
              x1={paddingLeft} 
              y1={grid.y} 
              x2={width - paddingRight} 
              y2={grid.y} 
              stroke="rgba(255,255,255,0.04)" 
              strokeDasharray="4 4"
            />
            <text 
              x={paddingLeft - 10} 
              y={grid.y + 4} 
              fill="var(--color-text-muted)" 
              fontSize="10" 
              fontWeight="600"
              textAnchor="end"
            >
              {grid.val.toFixed(1)}
            </text>
          </g>
        ))}

        {/* X Axis Border Line */}
        <line 
          x1={paddingLeft} 
          y1={height - paddingBottom} 
          x2={width - paddingRight} 
          y2={height - paddingBottom} 
          stroke="rgba(255,255,255,0.08)"
        />
        
        {/* Date Labels (Start and End) */}
        {points.length > 0 && (
          <>
            <text x={paddingLeft} y={height - 12} fill="var(--color-text-muted)" fontSize="10" fontWeight="600" textAnchor="start">
              {points[0].date}
            </text>
            <text x={width - paddingRight} y={height - 12} fill="var(--color-text-muted)" fontSize="10" fontWeight="600" textAnchor="end">
              {points[points.length - 1].date}
            </text>
          </>
        )}

        {/* Gradient Fill under Path */}
        <path d={fillD} fill={`url(#${gradId})`} />
        
        {/* Price Line */}
        <path 
          d={pathD} 
          fill="none" 
          stroke={strokeColor} 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        
        {/* Hover Dotted Guide Line */}
        {hoveredPoint && (
          <line
            x1={hoveredPoint.x}
            y1={paddingTop}
            x2={hoveredPoint.x}
            y2={height - paddingBottom}
            stroke="var(--color-accent)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}
        
        {/* Active Point Highlight Circle */}
        <circle 
          cx={hoveredPoint ? hoveredPoint.x : points[points.length - 1].x} 
          cy={hoveredPoint ? hoveredPoint.y : points[points.length - 1].y} 
          r={hoveredPoint ? "5" : "4"} 
          fill={hoveredPoint ? "var(--color-accent)" : strokeColor} 
          stroke="#fff" 
          strokeWidth="1.5"
        />

        {/* Floating Tooltip Box */}
        {hoveredPoint && (
          <g>
            <rect
              x={Math.max(paddingLeft, Math.min(hoveredPoint.x - 70, width - paddingRight - 140))}
              y={paddingTop - 12 >= 5 ? paddingTop - 12 : 5}
              width="140"
              height="38"
              rx="6"
              fill="rgba(10, 15, 29, 0.95)"
              stroke="var(--color-accent)"
              strokeWidth="1"
              style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}
            />
            <text
              x={Math.max(paddingLeft, Math.min(hoveredPoint.x - 70, width - paddingRight - 140)) + 70}
              y={(paddingTop - 12 >= 5 ? paddingTop - 12 : 5) + 14}
              fill="#fff"
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
            >
              ₹{hoveredPoint.val.toFixed(2)}
            </text>
            <text
              x={Math.max(paddingLeft, Math.min(hoveredPoint.x - 70, width - paddingRight - 140)) + 70}
              y={(paddingTop - 12 >= 5 ? paddingTop - 12 : 5) + 27}
              fill="var(--color-text-secondary)"
              fontSize="8"
              fontWeight="600"
              textAnchor="middle"
            >
              {hoveredPoint.date}
            </text>
          </g>
        )}

        {/* Hover Rectangles (Captures hover zone for each data point) */}
        {points.map((pt, idx) => {
          const sliceWidth = chartWidth / (points.length - 1);
          return (
            <rect
              key={idx}
              x={pt.x - sliceWidth / 2}
              y={paddingTop}
              width={sliceWidth}
              height={chartHeight}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
              onMouseEnter={() => setHoveredPoint(pt)}
              onMouseMove={() => setHoveredPoint(pt)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div className="animate-slide-up" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 80px 20px' }}>
      
      {/* Return Navigation */}
      <button className="glass-btn" onClick={onBack} style={{ marginBottom: 20 }}>
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      {/* Main Stock Summary Card */}
      <div className="glass-panel" style={{ padding: '24px 30px', marginBottom: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>{ticker.replace('.NS', '')}</h1>
            <span style={{ 
              fontSize: '1rem', 
              fontWeight: 700, 
              color: changePct >= 0 ? 'var(--color-bullish)' : 'var(--color-bearish)',
              background: changePct >= 0 ? 'var(--color-bullish-glow)' : 'var(--color-bearish-glow)',
              padding: '4px 8px',
              borderRadius: 6
            }}>
              {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
            </span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', marginTop: 4 }}>{name}</p>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            {formatCurrency(price)}
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Live Price</span>
          </div>
        </div>

        {/* Large Score Gauge */}
        <div>
          <ScoreGauge score={score} size={150} />
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 24 }}>
        
        {/* 1. Technical Analysis Module */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} style={{ color: 'var(--color-accent)' }} />
              Technical Indicators
            </h3>
            <span style={{ fontWeight: 800, color: getScoreColor(tech_score, 35) }}>
              {tech_score} / 35 Pts
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* RSI */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>RSI (14 Period)</span>
                <span style={{ fontWeight: 700 }}>{tech.rsi_value}</span>
              </div>
              <div style={{ fontSize: '0.85rem', marginTop: 4, fontWeight: 700, color: getScoreColor(tech.rsi_score, 10) }}>
                {tech.rsi_signal} ({tech.rsi_score}/10)
              </div>
            </div>
            
            {/* MACD */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>MACD Line</span>
                <span style={{ fontWeight: 700 }}>{tech.macd_value} (Sig: {tech.macd_signal_value})</span>
              </div>
              <div style={{ fontSize: '0.85rem', marginTop: 4, fontWeight: 700, color: getScoreColor(tech.macd_score, 15) }}>
                {tech.macd_signal} ({tech.macd_score}/15)
              </div>
            </div>
            
            {/* EMA */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>EMA Alignment (9 / 21)</span>
                <span style={{ fontWeight: 700 }}>EMA9: {formatCurrency(tech.ema9_value)}</span>
              </div>
              <div style={{ fontSize: '0.85rem', marginTop: 4, fontWeight: 700, color: getScoreColor(tech.ema_score, 10) }}>
                {tech.ema_signal} ({tech.ema_score}/10)
              </div>
            </div>
          </div>
        </div>

        {/* 2. AI Machine Learning Module */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={18} style={{ color: 'var(--color-accent)' }} />
              AI Price Prediction
            </h3>
            <span style={{ fontWeight: 800, color: getScoreColor(ml_score, 30) }}>
              {ml_score} / 30 Pts
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Core Prediction */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>CLASSIFICATION DIRECTION</div>
                <div style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: 800, 
                  color: ml.probability >= 0.50 ? 'var(--color-bullish)' : 'var(--color-bearish)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 2
                }}>
                  {ml.probability >= 0.50 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  {ml.probability >= 0.50 ? "EXPECTED UP" : "EXPECTED DOWN"}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>AI PROBABILITY</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{(ml.probability * 100).toFixed(1)}%</div>
              </div>
            </div>

            {/* Model Metadata */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0 4px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Classifier Engine:</span>
              <strong style={{ color: 'var(--color-accent)' }}>{ml.engine}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0 4px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Backtested Confidence:</span>
              <strong style={{ color: '#fff' }}>{(ml.accuracy * 100).toFixed(1)}% Accuracy</strong>
            </div>

            {/* Feature Importance */}
            {ml.feature_importances && ml.feature_importances.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Top ML Predictor Weights:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ml.feature_importances.map(([feat, imp], i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{feat}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                          <div style={{ width: `${imp * 100}%`, height: '100%', background: 'var(--color-accent)', borderRadius: 2 }}></div>
                        </div>
                        <span style={{ fontWeight: 600 }}>{(imp * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Volatility & Historical Price Chart Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Historical Price Chart */}
        <div className="glass-panel" style={{ padding: 24, gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Activity size={18} style={{ color: 'var(--color-accent)' }} />
            30-Trading-Day Closing Price Chart
          </h3>
          <div style={{ height: 200, width: '100%' }}>
            {renderHistoryChart()}
          </div>
        </div>

        {/* 3. Market Volatility & Breadth Module */}
        <div className="glass-panel" style={{ padding: 24, gridColumn: 'span 1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={18} style={{ color: 'var(--color-accent)' }} />
              Volatility & Breadth
            </h3>
            <span style={{ fontWeight: 800, color: getScoreColor(vol_score, 10) }}>
              {vol_score} / 10 Pts
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* India VIX */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>India VIX Factor</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: 2 }}>
                  {vol.vix_value ? vol.vix_value.toFixed(2) : '14.50'}
                </div>
              </div>
              <span className="score-badge score-high" style={{ 
                background: vol.vix_score >= 4 ? 'var(--color-bullish-glow)' : 'var(--color-bearish-glow)',
                color: vol.vix_score >= 4 ? 'var(--color-bullish)' : 'var(--color-bearish)',
                border: 'none'
              }}>
                +{vol.vix_score || 3} Pts
              </span>
            </div>

            {/* Volume Momentum */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Volume Conviction</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: 2 }}>
                  {vol.volume_score >= 4 ? 'Bullish Volume' : vol.volume_score === 3 ? 'Neutral Volume' : 'Distribution Volume'}
                </div>
              </div>
              <span className="score-badge score-high" style={{ 
                background: vol.volume_score >= 4 ? 'var(--color-bullish-glow)' : 'var(--color-bearish-glow)',
                color: vol.volume_score >= 4 ? 'var(--color-bullish)' : 'var(--color-bearish)',
                border: 'none'
              }}>
                +{vol.volume_score || 3} Pts
              </span>
            </div>

            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontStyle: 'italic', lineHeight: 1.4, padding: '0 4px' }}>
              * India VIX assesses overall index fear. Volume conviction checks if the daily price action is backed by strong accumulation or distribution.
            </div>
          </div>
        </div>
      </div>

      {/* 4. News Sentiment & Scraping Module */}
      <div className="glass-panel" style={{ padding: 24, marginBottom: 40 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 10 }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={20} style={{ color: 'var(--color-accent)' }} />
              News Sentiment Stream
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
              Active NLP Model: <strong style={{ color: 'var(--color-accent)' }}>{sent.engine}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Average Sentiment Index</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: sent.avg_sentiment >= 0.15 ? 'var(--color-bullish)' : sent.avg_sentiment <= -0.15 ? 'var(--color-bearish)' : 'var(--color-neutral)' }}>
                {sent.avg_sentiment ? (sent.avg_sentiment > 0 ? '+' : '') + sent.avg_sentiment.toFixed(2) : '0.00'} ({sent.label})
              </div>
            </div>
            
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 20, textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Score Awarded</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: getScoreColor(sent_score, 25) }}>
                {sent_score} / 25
              </div>
            </div>
          </div>
        </div>

        {/* News Feed Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 16 }}>
          {news.length > 0 ? (
            news.map((item, i) => (
              <a 
                key={i} 
                href={item.link} 
                target="_blank" 
                rel="noreferrer"
                className="news-card"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: 12,
                  padding: 16,
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                  transition: 'var(--transition-smooth)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-accent)', background: 'var(--color-accent-glow)', padding: '2px 6px', borderRadius: 4 }}>
                      {item.source}
                    </span>
                    <span className="score-badge" style={{ 
                      background: item.label === 'Positive' ? 'var(--color-bullish-glow)' : item.label === 'Negative' ? 'var(--color-bearish-glow)' : 'var(--color-neutral-glow)',
                      color: item.label === 'Positive' ? 'var(--color-bullish)' : item.label === 'Negative' ? 'var(--color-bearish)' : 'var(--color-neutral)',
                      border: 'none',
                      fontSize: '0.75rem',
                      padding: '2px 6px'
                    }}>
                      {item.label} ({item.score})
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: 10, lineHeight: 1.4, color: 'var(--color-text-primary)' }}>
                    {item.title}
                  </h4>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  <span>{formatToIST(item.pubDate)}</span>
                  <span style={{ textDecoration: 'underline' }}>Read Article &rarr;</span>
                </div>
              </a>
            ))
          ) : (
            <div style={{ gridColumn: 'span 2', padding: '30px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <AlertTriangle size={20} style={{ marginBottom: 8 }} />
              <div>No recent financial news articles found for this stock symbol.</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .news-card:hover {
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
          transform: translateY(-2px);
        }
        .news-card:hover h4 {
          color: #fff !important;
        }
      `}</style>

    </div>
  );
}
