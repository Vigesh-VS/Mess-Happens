import { useState, type KeyboardEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { ServingUnit } from '../../models';
import { formatQuantity } from '../../lib/nutrition';

interface StepperProps {
  label: string;
  value: number;
  unit: ServingUnit;
  disabled?: boolean;
  onStep: (direction: 1 | -1) => void;
  /** Tap the amount to type an exact value (e.g. 175 g). */
  onSet: (quantity: number) => void;
}

/**
 * Compact [−] 150 g [+]. The visible buttons are small, but each has an invisible ~40px hit
 * area so they stay easy to tap. The amount itself is a button that turns into an input.
 */
export function Stepper({ label, value, unit, disabled = false, onStep, onSet }: StepperProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const btn = [
    'relative flex size-6 shrink-0 items-center justify-center border border-ink text-ink transition-colors',
    "before:absolute before:-inset-2 before:content-['']",
    'hover:bg-hover active:bg-ink active:text-paper',
    'disabled:cursor-not-allowed disabled:border-line disabled:text-line disabled:hover:bg-transparent',
  ].join(' ');

  function commit() {
    if (draft === null) return;
    const n = Number(draft.replace(',', '.'));
    setDraft(null);
    if (draft.trim() !== '' && Number.isFinite(n) && n >= 0) onSet(n);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') setDraft(null);
  }

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={`${label} quantity`}>
      <button type="button" className={btn} onClick={() => onStep(-1)} disabled={disabled || value <= 0} aria-label={`Remove ${label}`}>
        <Minus aria-hidden className="size-3" strokeWidth={2.5} />
      </button>

      {draft !== null ? (
        <span className="flex items-center gap-1">
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
            onFocus={(e) => e.currentTarget.select()}
            aria-label={`Amount of ${label} in ${unit}`}
            className="h-6 w-14 border-0 border-b border-ink bg-transparent px-0 text-center text-xs tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-xs text-muted">{unit}</span>
        </span>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setDraft(value > 0 ? String(value) : '')}
          aria-label={`${formatQuantity(value, unit)} of ${label}. Tap to type an amount`}
          className={[
            'relative min-w-12 px-1 text-center text-xs tabular-nums underline-offset-2',
            "before:absolute before:-inset-y-2 before:inset-x-0 before:content-['']",
            'disabled:cursor-not-allowed enabled:hover:underline',
            value > 0 ? 'font-semibold text-ink' : 'text-muted',
          ].join(' ')}
        >
          <span aria-live="polite">{formatQuantity(value, unit)}</span>
        </button>
      )}

      <button type="button" className={btn} onClick={() => onStep(1)} disabled={disabled} aria-label={`Add ${label}`}>
        <Plus aria-hidden className="size-3" strokeWidth={2.5} />
      </button>
    </div>
  );
}
