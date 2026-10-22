import { useId, type InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

/** Underlined input with an uppercase label — no boxes. */
export function TextField({ label, hint, error, id, className = '', ...rest }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="label block">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={[
          'mt-2 block min-h-11 w-full border-0 border-b bg-transparent px-0 text-lg outline-none transition-colors',
          'placeholder:text-muted/60 focus:border-ink focus-visible:outline-none',
          error ? 'border-danger' : 'border-line',
        ].join(' ')}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-2 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
