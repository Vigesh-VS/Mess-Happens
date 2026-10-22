import { Minus, Plus } from 'lucide-react';

interface StepperProps {
  label: string;
  /** Formatted quantity, e.g. "150 g". */
  display: string;
  value: number;
  disabled?: boolean;
  onStep: (direction: 1 | -1) => void;
}

/** [−] 150 g [+] — 44px touch targets, keyboard accessible, announces changes. */
export function Stepper({ label, display, value, disabled = false, onStep }: StepperProps) {
  const btn =
    'flex size-11 shrink-0 items-center justify-center border border-ink text-ink transition-colors hover:bg-hover active:bg-ink active:text-paper disabled:cursor-not-allowed disabled:border-line disabled:text-line disabled:hover:bg-transparent';
  return (
    <div className="flex items-center" role="group" aria-label={`${label} quantity`}>
      <button type="button" className={btn} onClick={() => onStep(-1)} disabled={disabled || value <= 0} aria-label={`Remove ${label}`}>
        <Minus aria-hidden className="size-4" strokeWidth={2.25} />
      </button>
      <output aria-live="polite" className={['min-w-18 px-2 text-center text-sm tabular-nums', value > 0 ? 'font-semibold text-ink' : 'text-muted'].join(' ')}>
        {display}
      </output>
      <button type="button" className={btn} onClick={() => onStep(1)} disabled={disabled} aria-label={`Add ${label}`}>
        <Plus aria-hidden className="size-4" strokeWidth={2.25} />
      </button>
    </div>
  );
}
