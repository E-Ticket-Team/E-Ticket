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

  return (
    <div className="card card-padded">
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{title}</h3>
        {subtitle && (
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: 3 }}>
            {subtitle}
          </p>
        )}
      </div>

      {points.length === 0 ? (
        <div className="chart-empty">{emptyMessage}</div>
      ) : (
        <div className="chart-bars">
          {points.map((pt) => {
            const pct = Math.max(4, Math.round((pt.value / maxValue) * 100));
            return (
              <div key={pt.label} className="chart-row">
                <div className="chart-row-head">
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {pt.label}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>
                    {formatAsCurrency ? formatCurrency(pt.value) : pt.value}
                    {pt.secondaryLabel ? ` · ${pt.secondaryLabel}` : ''}
                  </span>
                </div>
                <div className="progress-track" style={{ height: 10 }}>
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
