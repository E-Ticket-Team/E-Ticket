import { useState, type ReactNode } from 'react';
import { formatCurrency } from '@/utils/format';

export interface MultiBarSeries {
  key: string;
  label: string;
  color: string;
  value: number;
  isCurrency?: boolean;
}

export interface MultiBarGroupPoint {
  label: string;
  caption?: string;
  bars: MultiBarSeries[];
}

interface SalesBarAnalyticsCardProps {
  title: string;
  subtitle?: string;
  groups: MultiBarGroupPoint[];
  headerSlot?: ReactNode;
  emptyMessage?: string;
}

export function SalesBarAnalyticsCard({
  title,
  subtitle,
  groups,
  headerSlot,
  emptyMessage = 'No analytics recorded yet.',
}: SalesBarAnalyticsCardProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const legendItems =
    groups.length > 0
      ? groups[0].bars.map((b) => ({
          key: b.key,
          label: b.label,
          color: b.color,
        }))
      : [];

  const allValues = groups.flatMap((g) => g.bars.map((b) => b.value));
  const rawMax = Math.max(4, ...allValues);
  const niceMax = Math.ceil(rawMax / 4) * 4;

  const chartHeight = 165;
  const barWidth = 14;
  const innerGap = 5;
  const barsPerGroup = Math.max(1, groups[0]?.bars.length ?? 1);
  const groupWidth = barsPerGroup * barWidth + (barsPerGroup - 1) * innerGap;
  const groupGap = 32;
  const leftPad = 42;
  const svgWidth = Math.max(
    420,
    leftPad + groups.length * (groupWidth + groupGap) + 18,
  );

  const activeIndex = hoveredIdx ?? (groups.length > 0 ? groups.length - 1 : null);
  const activeGroup =
    activeIndex !== null && groups[activeIndex] ? groups[activeIndex] : null;

  return (
    <div className="bg-white border border-[#E3EBE5] rounded-2xl p-6 shadow-[0_2px_10px_rgba(5,46,37,0.04)] flex flex-col justify-between h-full">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="text-base font-bold text-[#052E25]">{title}</h2>
          {subtitle && (
            <p className="text-xs text-[#64766D] mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {legendItems.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              {legendItems.map((item) => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#53665E]"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.label}</span>
                </span>
              ))}
            </div>
          )}
          {headerSlot}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="chart-empty my-auto">{emptyMessage}</div>
      ) : (
        <div className="relative">
          {activeGroup && (
            <div className="mb-3 inline-flex items-center gap-3 flex-wrap bg-[#FAFCFA] border border-[#E3EBE5] rounded-xl px-3.5 py-2 text-xs">
              <span className="font-bold text-[#052E25]">
                {activeGroup.caption || activeGroup.label}:
              </span>
              {activeGroup.bars.map((bar) => (
                <span key={bar.key} className="inline-flex items-center gap-1.5 font-semibold text-[#53665E] tabular-nums">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: bar.color }}
                  />
                  <span>
                    {bar.label}:{' '}
                    <strong className="text-[#052E25]">
                      {bar.isCurrency ? formatCurrency(bar.value) : bar.value}
                    </strong>
                  </span>
                </span>
              ))}
            </div>
          )}

          <div className="svg-chart-wrap">
            <svg
              viewBox={`0 0 ${svgWidth} ${chartHeight + 48}`}
              style={{
                width: '100%',
                minWidth: Math.min(svgWidth, 400),
                height: 'auto',
                display: 'block',
              }}
              role="img"
              aria-label={title}
            >
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = Math.round(chartHeight * (1 - ratio) + 14);
                const tickVal = Math.round(niceMax * ratio);
                return (
                  <g key={ratio}>
                    <line
                      x1={leftPad}
                      y1={y}
                      x2={svgWidth - 12}
                      y2={y}
                      stroke="#E3EBE5"
                      strokeDasharray={ratio === 0 ? undefined : '4 4'}
                      strokeWidth={1}
                    />
                    <text
                      x={leftPad - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fontWeight="600"
                      fill="#82948B"
                    >
                      {tickVal}
                    </text>
                  </g>
                );
              })}

              {groups.map((grp, idx) => {
                const startX = leftPad + 16 + idx * (groupWidth + groupGap);
                const shortLabel =
                  grp.label.length > 10 ? `${grp.label.slice(0, 9)}…` : grp.label;
                const isGroupActive = idx === hoveredIdx;

                return (
                  <g
                    key={grp.label + idx}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <rect
                      x={startX - 6}
                      y={10}
                      width={groupWidth + 12}
                      height={chartHeight + 8}
                      rx={8}
                      fill={isGroupActive ? '#F6F8F5' : 'transparent'}
                    />

                    {grp.bars.map((bar, bIdx) => {
                      const bx = startX + bIdx * (barWidth + innerGap);
                      const bh = Math.max(
                        4,
                        Math.round((bar.value / niceMax) * (chartHeight - 10)),
                      );
                      const by = chartHeight + 14 - bh;
                      return (
                        <rect
                          key={bar.key}
                          x={bx}
                          y={by}
                          width={barWidth}
                          height={bh}
                          rx={5}
                          fill={bar.color}
                        />
                      );
                    })}

                    <text
                      x={startX + groupWidth / 2}
                      y={chartHeight + 34}
                      textAnchor="middle"
                      fontSize="10.5"
                      fontWeight={isGroupActive ? '700' : '500'}
                      fill={isGroupActive ? '#052E25' : '#64766D'}
                    >
                      {shortLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
