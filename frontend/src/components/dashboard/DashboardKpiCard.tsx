import { useEffect, useRef, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { runCountUp } from '@/animations/scroll-reveals';

interface DashboardKpiCardProps {
  label: string;
  value: string | number;
  deltaText?: string;
  deltaTone?: 'positive' | 'warning' | 'danger' | 'neutral';
  icon: ReactNode;
  onAction?: () => void;
  actionLabel?: string;
}

export function DashboardKpiCard({
  label,
  value,
  deltaText,
  deltaTone = 'positive',
  icon,
  onAction,
  actionLabel,
}: DashboardKpiCardProps) {
  const valueRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof value === 'number') {
      runCountUp(valueRef.current, value, (v: number) =>
        new Intl.NumberFormat('en-US').format(Math.round(v)),
      );
    }
  }, [value]);

  const formattedStatic =
    typeof value === 'number'
      ? new Intl.NumberFormat('en-US').format(value)
      : value;

  const deltaColors: Record<string, string> = {
    positive: 'text-[#087F5B] bg-[#E7F5EE]',
    warning: 'text-[#92400E] bg-[#FEF7E8]',
    danger: 'text-[#991B1B] bg-[#FEF2F2]',
    neutral: 'text-[#53665E] bg-[#F1F6F1]',
  };

  return (
    <div className="kpi-card bg-white border border-[#E3EBE5] rounded-2xl p-5 shadow-[0_2px_10px_rgba(5,46,37,0.04)] flex flex-col justify-between gap-4 hover:border-[#C8D6CD] transition">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#E7F5EE] text-[#087F5B]">
            {icon}
          </span>
          <span className="text-[13px] font-semibold text-[#53665E]">{label}</span>
        </div>

        {onAction && (
          <button
            type="button"
            onClick={onAction}
            title={actionLabel || `View ${label}`}
            aria-label={actionLabel || `View ${label}`}
            className="text-[#82948B] hover:text-[#052E25] p-1 rounded-lg hover:bg-[#F6F8F5] transition"
          >
            <MoreHorizontal size={16} />
          </button>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div
          ref={valueRef}
          className="text-2xl sm:text-[27px] font-extrabold text-[#052E25] tracking-tight tabular-nums"
        >
          {formattedStatic}
        </div>
        {deltaText && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums ${deltaColors[deltaTone]}`}
          >
            {deltaText}
          </span>
        )}
      </div>
    </div>
  );
}
