import React from 'react';

interface Point {
  label: string;
  value: number;
}

interface Props {
  data: Point[];
  height?: number;
}

const AreaLineChart: React.FC<Props> = ({ data, height = 220 }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  const step = data.length > 1 ? 100 / (data.length - 1) : 100;

  const points = data.map((d, i) => {
    const x = i * step;
    const y = ((max - d.value) / max) * (height - 20) + 10;
    return `${x},${y}`;
  }).join(' ');

  const areaPath = `M0 ${height - 10} L ${points} L 100 ${height - 10} Z`;

  return (
    <div className="w-full bg-[#2A2738] p-4 rounded-2xl border border-[#8C1AFF]/10">
      <h4 className="text-white font-semibold mb-3">Évolution - dernières 24h</h4>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full h-[220px]">
        <defs>
          <linearGradient id="a" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#00FFF7" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8C1AFF" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#a)" stroke="none" />
        <polyline points={points} fill="none" stroke="#00FFF7" strokeWidth={0.6} strokeLinejoin="round" strokeLinecap="round" />

        {data.map((d, i) => {
          const x = i * step;
          const y = ((max - d.value) / max) * (height - 20) + 10;
          return (
            <g key={d.label}>
              <circle cx={`${x}%`} cy={y} r={1.2} fill="#8C1AFF" />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default AreaLineChart;
