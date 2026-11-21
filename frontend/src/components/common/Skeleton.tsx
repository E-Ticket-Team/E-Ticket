import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  style?: CSSProperties;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = 16,
  style,
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}

export function EventCardSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="event-card" style={{ padding: 0 }}>
          <Skeleton height={172} style={{ borderRadius: 0 }} />
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <Skeleton width={90} height={22} />
              <Skeleton width={76} height={22} />
            </div>
            <Skeleton width="85%" height={22} />
            <Skeleton width="65%" height={15} />
            <Skeleton width="72%" height={15} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <Skeleton width={95} height={28} />
              <Skeleton width={88} height={32} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
