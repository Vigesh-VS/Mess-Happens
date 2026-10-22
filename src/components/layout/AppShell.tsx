import { NavLink, Outlet } from 'react-router';
import { NAV_ITEMS } from './navItems';
import { OfflineBadge } from './OfflineBadge';

/**
 * Phones/tablets: content + fixed bottom bar.
 * Desktop (lg+): a quiet typographic sidebar on the left.
 */
export function AppShell() {
  return (
    <div className="min-h-dvh lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:p-2">
        Skip to content
      </a>

      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-line lg:px-8 lg:py-10">
        <p className="text-2xl font-extrabold tracking-tight">Mess.</p>
        <nav aria-label="Main" className="mt-12 flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                ['py-1.5 text-lg transition-colors', isActive ? 'font-bold text-ink' : 'text-muted hover:text-ink'].join(' ')
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <OfflineBadge className="mt-auto" />
      </aside>

      <div className="min-w-0 flex-1">
        <OfflineBadge className="border-b border-line px-4 py-2 sm:px-6 lg:hidden" />
        <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-28 pt-8 sm:px-6 sm:pt-12 lg:px-12 lg:pb-16">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  [
                    'flex min-h-14 flex-col items-center justify-center gap-1 text-[0.6875rem] transition-colors',
                    isActive ? 'font-semibold text-ink' : 'text-muted hover:text-ink',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon aria-hidden className="size-5" strokeWidth={isActive ? 2.25 : 1.75} />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
