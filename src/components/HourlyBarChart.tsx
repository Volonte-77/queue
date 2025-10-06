import React from 'react';

interface Point {
  label: string;
  value: number;
}

interface Props {
  data: Point[];
  height?: number;
}

const HourlyBarChart: React.FC<Props> = ({ data, height = 220 }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  const barWidth = 100 / data.length;

  return (
    <div className="w-full bg-[#2A2738] p-4 rounded-2xl border border-[#00FFF7]/10">
      <h4 className="text-white font-semibold mb-3">Affluence par heure</h4>
      <div className="w-full">
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full h-[220px]">
          {data.map((d, i) => {
            const x = i * barWidth;
            const h = (d.value / max) * (height - 30);
            const y = height - h - 10;
            return (
              <g key={d.label}>
                <rect
                  x={`${x}%`}
                  y={y}
                  width={`${barWidth * 0.75}%`}
                  height={h}
                  rx={3}
                  fill="url(#g)"
                />
                {i % Math.max(1, Math.floor(data.length / 8)) === 0 && (
                  <text x={`${x + barWidth / 2}%`} y={height - 2} fontSize={3} fill="#9CA3AF" textAnchor="middle">
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}

          <defs>
            <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#8C1AFF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#00FFF7" stopOpacity="0.6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

export default HourlyBarChart;
