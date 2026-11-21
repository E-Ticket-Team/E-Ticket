import { useEffect, useRef, type ReactNode } from 'react';
import { runCountUp } from '../../animations/scroll-reveals';

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: 'default' | 'brand' | 'success' | 'warning' | 'danger';
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: StatCardProps) {
  const valueRef = useRef<HTMLDivElement | null>(null);

  const colorMap: Record<string, string> = {
    default: 'var(--color-forest-dark)',
    brand: 'var(--color-primary)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
  };

  useEffect(() => {
    if (typeof value === 'number') {
      runCountUp(valueRef.current, value, (v: number) => String(Math.round(v)));
    }
  }, [value]);

  return (
    <div className="kpi-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span className="kpi-label">{label}</span>
        {icon && <span style={{ color: colorMap[tone] }}>{icon}</span>}
      </div>
      <div ref={valueRef} className="kpi-value" style={{ color: colorMap[tone] }}>
        {value}
      </div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  );
}
