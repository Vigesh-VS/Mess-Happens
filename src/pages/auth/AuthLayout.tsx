import type { ReactNode } from 'react';

export function AuthLayout({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12">
      <p className="text-2xl font-extrabold tracking-tight">Mess.</p>
      <h1 className="text-display mt-10 border-b border-ink pb-6">{title}</h1>
      <div className="mt-8">{children}</div>
      {footer ? <div className="mt-10 border-t border-line pt-6 text-sm text-muted">{footer}</div> : null}
    </main>
  );
}
