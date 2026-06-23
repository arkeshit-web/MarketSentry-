import React from 'react';

export default function ScoreGauge({ score, size = 150 }) {
  const radius = size * 0.4;
  const strokeWidth = size * 0.08;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  let color = 'var(--color-neutral)';
  let glowColor = 'var(--color-neutral-glow)';
  let label = 'NEUTRAL';
  
  if (score >= 70) {
    color = 'var(--color-bullish)';
    glowColor = 'var(--color-bullish-glow)';
    label = 'BUY / BULLISH';
  } else if (score < 40) {
    color = 'var(--color-bearish)';
    glowColor = 'var(--color-bearish-glow)';
    label = 'SELL / BEARISH';
  }

  return (
    <div style={{ 
      position: 'relative', 
      width: size, 
      height: size, 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      margin: '0 auto'
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 1s ease-out',
            filter: `drop-shadow(0 0 4px ${color})`
          }}
        />
      </svg>
      
      {/* Center Label */}
      <div style={{
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center'
      }}>
        <span style={{ 
          fontSize: `${size * 0.22}px`, 
          fontWeight: 800, 
          color: 'var(--color-text-primary)',
          lineHeight: 1
        }}>
          {score}
        </span>
        <span style={{ 
          fontSize: `${size * 0.07}px`, 
          color: 'var(--color-text-secondary)',
          fontWeight: 600,
          marginTop: 2,
          letterSpacing: '0.05em'
        }}>
          SCORE
        </span>
        <span style={{ 
          fontSize: `${size * 0.07}px`, 
          color: color,
          fontWeight: 800,
          marginTop: 4,
          letterSpacing: '0.05em',
          textShadow: `0 0 8px ${glowColor}`
        }}>
          {label}
        </span>
      </div>
    </div>
  );
}
