import { formatCurrency } from '../../utils/format';

interface BarPoint {
  label: string;
  value: number;
  secondaryLabel?: string;
}

interface AnalyticsChartProps {
  title: string;
  subtitle?: string;
  points: BarPoint[];
  formatAsCurrency?: boolean;
  emptyMessage?: string;
}

export function AnalyticsChart({
  title,
  subtitle,
  points,
  formatAsCurrency = false,
  emptyMessage = 'No recorded data yet.',
}: AnalyticsChartProps) {
  const maxValue = Math.max(1, ...points.map((p) => p.value));
  const chartHeight = 160;
  const barWidth = 42;
  const gap = 24;
  const svgWidth = Math.max(360, points.length * (barWidth + gap) + 40);

  return (
    <div className="card card-padded">
      <div style={{ marginBottom: 18 }}>
        <h3 className="card-title">{title}</h3>
        {subtitle && (
          <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', marginTop: 3 }}>
            {subtitle}
          </p>
        )}
      </div>

      {points.length === 0 ? (
        <div className="chart-empty">{emptyMessage}</div>
      ) : (
        <div className="svg-chart-wrap">
          <svg
            viewBox={`0 0 ${svgWidth} ${chartHeight + 56}`}
            style={{ width: '100%', minWidth: Math.min(svgWidth, 420), height: 'auto', display: 'block' }}
            role="img"
            aria-label={title}
          >
            {/* Subtle horizontal reference gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = Math.round(chartHeight * (1 - ratio) + 16);
              return (
                <line
                  key={ratio}
                  x1={12}
                  y1={y}
                  x2={svgWidth - 12}
                  y2={y}
                  stroke="#E3EBE5"
                  strokeDasharray={ratio === 0 ? undefined : '4 4'}
                  strokeWidth={1}
                />
              );
            })}

            {points.map((pt, index) => {
              const x = 24 + index * (barWidth + gap);
              const barH = Math.max(6, Math.round((pt.value / maxValue) * (chartHeight - 12)));
              const y = chartHeight + 16 - barH;
              const formattedVal = formatAsCurrency
                ? formatCurrency(pt.value)
                : String(pt.value);
              const shortLabel =
                pt.label.length > 12 ? `${pt.label.slice(0, 11)}…` : pt.label;

              return (
                <g key={pt.label}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barH}
                    rx={6}
                    fill={index % 2 === 0 ? '#087F5B' : '#064E3B'}
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill="#102A21"
                  >
                    {formattedVal}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 34}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill="#53665E"
                  >
                    {shortLabel}
                  </text>
                  {pt.secondaryLabel && (
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight + 48}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#82948B"
                    >
                      {pt.secondaryLabel}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
