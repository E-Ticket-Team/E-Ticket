import type { ReactNode } from 'react';

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
  const colorMap: Record<string, string> = {
    default: 'var(--text-primary)',
    brand: 'var(--brand-primary)',
    success: 'var(--success-solid)',
    warning: 'var(--warning-solid)',
    danger: 'var(--danger-solid)',
  };

  return (
    <div className="kpi-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span className="kpi-label">{label}</span>
        {icon && <span style={{ color: colorMap[tone] }}>{icon}</span>}
      </div>
      <div className="kpi-value" style={{ color: colorMap[tone] }}>
        {value}
      </div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  );
}
