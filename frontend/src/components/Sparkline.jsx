import React from 'react';

export default function Sparkline({ prices }) {
  if (!prices || prices.length < 2) {
    return <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>No data</div>;
  }

  const width = 120;
  const height = 40;
  const padding = 2;
  
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min === 0 ? 1 : max - min;
  
  const points = prices.map((price, index) => {
    const x = (index / (prices.length - 1)) * width;
    // Invert y because SVG y goes down
    const y = padding + ((max - price) / range) * (height - 2 * padding);
    return { x, y };
  });

  const pathD = points.reduce((acc, point, index) => {
    return acc + (index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
  }, "");

  // Closed path for fill area
  const fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  const isUp = prices[prices.length - 1] >= prices[0];
  const strokeColor = isUp ? 'var(--color-bullish)' : 'var(--color-bearish)';
  const gradientId = `sparkline-grad-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      
      {/* Area under line */}
      <path d={fillD} fill={`url(#${gradientId})`} />
      
      {/* Sparkline path */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* End point dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="2"
        fill={strokeColor}
      />
    </svg>
  );
}
