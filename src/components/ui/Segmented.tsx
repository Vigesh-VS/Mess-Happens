interface SegmentedProps<T extends string> {
  label: string;
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

/** A row of mutually exclusive buttons (radio-group semantics). */
export function Segmented<T extends string>({ label, options, value, onChange, size = 'md' }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap border border-ink">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={[
              'relative flex-1 border-ink px-3 font-semibold transition-colors [&:not(:first-child)]:border-l',
              size === 'sm' ? 'min-h-11 text-xs' : 'min-h-11 text-sm',
              active ? 'bg-ink text-paper' : 'text-ink hover:bg-hover',
            ].join(' ')}
          >
            {o.label}
            {o.hint ? <span className={['block text-[0.625rem] font-normal', active ? 'text-paper/70' : 'text-muted'].join(' ')}>{o.hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
