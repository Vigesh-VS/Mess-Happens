import type { ReactNode } from 'react';

interface NoticeProps {
  tone?: 'neutral' | 'error';
  title?: string;
  children: ReactNode;
}

/** A ruled block for messages — a left rule instead of a coloured box. */
export function Notice({ tone = 'neutral', title, children }: NoticeProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={['border-l-2 py-1 pl-4', tone === 'error' ? 'border-danger' : 'border-ink'].join(' ')}
    >
      {title ? <p className={['font-semibold', tone === 'error' ? 'text-danger' : ''].join(' ')}>{title}</p> : null}
      <div className={tone === 'error' ? 'text-danger' : 'text-muted'}>{children}</div>
    </div>
  );
}
