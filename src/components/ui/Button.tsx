import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'quiet';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  busy?: boolean;
  icon?: ReactNode;
  block?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink/85 disabled:bg-ink/40',
  secondary: 'border border-ink text-ink hover:bg-hover disabled:border-line disabled:text-muted',
  quiet: 'text-ink underline-offset-4 hover:underline disabled:text-muted px-0',
};

export function Button({ variant = 'primary', busy = false, icon, block = false, className = '', children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={[
        'inline-flex min-h-11 items-center justify-center gap-2 px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed',
        variants[variant],
        block ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {busy ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
