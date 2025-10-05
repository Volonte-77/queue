import React from 'react';

interface DonutProps {
  value: number; // 0..100
  size?: number;
  strokeWidth?: number;
  color?: string;
}

const Donut: React.FC<DonutProps> = ({ value, size = 64, strokeWidth = 8, color = '#8C1AFF' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <circle r={radius} fill="none" stroke="#2A2738" strokeWidth={strokeWidth} />
        <circle r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90)" />
        <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize={12} fontWeight={600}>{value}%</text>
      </g>
    </svg>
  );
};

export default Donut;
