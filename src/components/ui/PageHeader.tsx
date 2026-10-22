import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** Small uppercase line above the title, e.g. the date. */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Right-aligned controls on wide screens; stacks below on phones. */
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-ink pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="label mb-3">{eyebrow}</p> : null}
        <h1 className="text-display break-words">{title}</h1>
      </div>
      {actions ? <div className="flex shrink-0 gap-3">{actions}</div> : null}
    </header>
  );
}
