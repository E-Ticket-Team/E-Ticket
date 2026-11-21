import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          backgroundColor: 'var(--color-primary-light)',
          border: '1px solid var(--color-primary-soft)',
          color: 'var(--color-primary)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}
      >
        {icon}
      </div>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 6 }}>{title}</h3>
      <p style={{ color: 'var(--color-text-muted)', maxWidth: 440, margin: '0 auto 18px', fontSize: '0.93rem' }}>
        {description}
      </p>
      {action}
    </div>
  );
}
