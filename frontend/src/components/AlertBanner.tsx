import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface AlertBannerProps {
  variant?: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  message: string;
}

export function AlertBanner({ variant = 'info', title, message }: AlertBannerProps) {
  const Icon =
    variant === 'error'
      ? AlertCircle
      : variant === 'success'
        ? CheckCircle2
        : variant === 'warning'
          ? AlertTriangle
          : Info;

  return (
    <div className={`alert alert-${variant}`} role="alert">
      <Icon size={18} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        {title && <div style={{ fontWeight: 700, marginBottom: 2 }}>{title}</div>}
        <div style={{ fontSize: '0.92rem' }}>{message}</div>
      </div>
    </div>
  );
}
