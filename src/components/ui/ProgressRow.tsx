import { formatNumber } from '../../lib/nutrition';

interface ProgressRowProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  note?: string;
}

/** "Protein  72 / 90 g" with a hairline bar — no colour, just ink on a grey rule. */
export function ProgressRow({ label, value, target, unit, note }: ProgressRowProps) {
  const pct = target > 0 ? value / target : 0;
  const over = value - target;
  return (
    <div className="py-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-lg font-semibold">{label}</span>
        <span className="tabular-nums">
          <span className="text-title">{formatNumber(value, unit === 'kcal' ? 0 : 1)}</span>
          <span className="text-muted">
            {' '}
            / {formatNumber(target)} {unit}
          </span>
        </span>
      </div>
      <div
        className="mt-3 h-1 w-full bg-line"
        role="progressbar"
        aria-label={`${label}: ${formatNumber(value)} of ${formatNumber(target)} ${unit}`}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.round(value)}
      >
        <div className="h-full bg-ink" style={{ width: `${Math.min(100, pct * 100)}%` }} />
      </div>
      <p className="mt-2 text-sm text-muted">
        {target > 0 ? (over > 0 ? `${formatNumber(over, 1)} ${unit} over target` : `${formatNumber(-over, 1)} ${unit} to go`) : ''}
        {note ? ` · ${note}` : ''}
      </p>
    </div>
  );
}
