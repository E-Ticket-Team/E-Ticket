import { useState, type ReactNode } from 'react';

export interface DonutSegment {
  id: string;
  label: string;
  value: number;
  color: string;
}

interface DonutBreakdownCardProps {
  title: string;
  subtitle?: string;
  centerPrimary: string | number;
  centerSecondary?: string | number;
  centerCaption: string;
  segments: DonutSegment[];
  headerSlot?: ReactNode;
  emptyMessage?: string;
}

export function DonutBreakdownCard({
  title,
  subtitle,
  centerPrimary,
  centerSecondary,
  centerCaption,
  segments,
  headerSlot,
  emptyMessage = 'No activity recorded yet.',
}: DonutBreakdownCardProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const nonZeroSegments = segments.filter((s) => s.value > 0);
  const total = nonZeroSegments.reduce((sum, s) => sum + s.value, 0);

  const radius = 78;
  const circumference = 2 * Math.PI * radius;

  let cumulativeFraction = 0;
  const arcs = nonZeroSegments.map((seg) => {
    const fraction = total > 0 ? seg.value / total : 0;
    const strokeLength = fraction * circumference;
    const gap = nonZeroSegments.length > 1 ? 4 : 0;
    const dashArray = `${Math.max(0, strokeLength - gap)} ${circumference}`;
    const dashOffset = -cumulativeFraction * circumference;
    cumulativeFraction += fraction;
    return {
      ...seg,
      dashArray,
      dashOffset,
      percentage: Math.round(fraction * 100),
    };
  });

  const activeSegment =
    arcs.find((a) => a.id === hoveredId) ?? arcs[0] ?? null;

  return (
    <div className="bg-white border border-[#E3EBE5] rounded-2xl p-6 shadow-[0_2px_10px_rgba(5,46,37,0.04)] flex flex-col justify-between h-full">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="text-base font-bold text-[#052E25]">{title}</h2>
          {subtitle && (
            <p className="text-xs text-[#64766D] mt-0.5">{subtitle}</p>
          )}
        </div>
        {headerSlot}
      </div>

      {total === 0 ? (
        <div className="chart-empty my-auto">{emptyMessage}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-6 my-auto">
          <div className="sm:col-span-6 relative flex items-center justify-center">
            {activeSegment && (
              <div className="absolute -top-1 left-0 z-10 bg-white border border-[#E3EBE5] rounded-xl px-3 py-1.5 shadow-[0_8px_24px_rgba(5,46,37,0.1)] pointer-events-none">
                <div className="text-[11px] font-medium text-[#64766D]">
                  {activeSegment.label}
                </div>
                <div className="text-xs font-extrabold tabular-nums text-[#087F5B]">
                  {new Intl.NumberFormat('en-US').format(activeSegment.value)} ({activeSegment.percentage}%)
                </div>
              </div>
            )}

            <svg
              viewBox="0 0 210 210"
              className="w-[196px] h-[196px] -rotate-90"
              role="img"
              aria-label={title}
            >
              <circle
                cx="105"
                cy="105"
                r={radius}
                fill="none"
                stroke="#F1F6F1"
                strokeWidth="28"
              />
              {arcs.map((arc) => {
                const isHovered = hoveredId === arc.id;
                return (
                  <circle
                    key={arc.id}
                    cx="105"
                    cy="105"
                    r={radius}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={isHovered ? 32 : 28}
                    strokeDasharray={arc.dashArray}
                    strokeDashoffset={arc.dashOffset}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredId(arc.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  />
                );
              })}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <div className="text-xl font-extrabold text-[#052E25] tabular-nums leading-tight">
                {centerPrimary}
                {centerSecondary !== undefined && (
                  <span className="text-xs font-bold text-[#64766D]">
                    {' '}/ {centerSecondary}
                  </span>
                )}
              </div>
              <div className="text-[11px] font-semibold text-[#64766D] mt-0.5">
                {centerCaption}
              </div>
            </div>
          </div>

          <div className="sm:col-span-6 flex flex-col gap-2.5">
            {segments.map((seg) => {
              const isHovered = hoveredId === seg.id;
              return (
                <button
                  key={seg.id}
                  type="button"
                  onMouseEnter={() => setHoveredId(seg.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() =>
                    setHoveredId((prev) => (prev === seg.id ? null : seg.id))
                  }
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition ${
                    isHovered ? 'bg-[#F6F8F5]' : 'hover:bg-[#FAFCFA]'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="text-xs font-semibold text-[#102A21] truncate">
                      {seg.label}
                    </span>
                  </span>
                  <span className="text-xs font-bold text-[#052E25] tabular-nums shrink-0">
                    {new Intl.NumberFormat('en-US').format(seg.value)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
