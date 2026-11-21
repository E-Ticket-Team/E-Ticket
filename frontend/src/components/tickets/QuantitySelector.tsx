import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  value: number;
  min?: number;
  max: number;
  disabled?: boolean;
  onChange: (next: number) => void;
  label?: string;
}

export function QuantitySelector({
  value,
  min = 0,
  max,
  disabled = false,
  onChange,
  label = 'Ticket quantity',
}: QuantitySelectorProps) {
  return (
    <div className="qty-selector" role="group" aria-label={label}>
      <button
        type="button"
        className="qty-btn"
        aria-label={`Decrease ${label}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus size={14} />
      </button>
      <span className="qty-value" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="qty-btn"
        aria-label={`Increase ${label}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
