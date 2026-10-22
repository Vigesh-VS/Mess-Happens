import type { ReactNode } from 'react';
import { Link } from 'react-router';

export function AuthLayout({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12">
      <div className="flex items-baseline justify-between gap-4">
        <Link to="/" className="text-2xl font-extrabold tracking-tight">
          Mess.
        </Link>
        <Link to="/" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          See today’s menu
        </Link>
      </div>
      <h1 className="text-display mt-10 border-b border-ink pb-6">{title}</h1>
      <div className="mt-8">{children}</div>
      {footer ? <div className="mt-10 border-t border-line pt-6 text-sm text-muted">{footer}</div> : null}
    </main>
  );
}
