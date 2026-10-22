import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router';
import { LoadingScreen } from '../ui/LoadingScreen';

const ADMIN_TABS = [
  { to: '/admin', label: 'Overview' },
  { to: '/admin/foods', label: 'Foods' },
  { to: '/admin/menus', label: 'Menus' },
];

export function AdminLayout() {
  return (
    <div>
      <nav aria-label="Admin" className="mb-8 flex gap-6 border-b border-line">
        {ADMIN_TABS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              [
                '-mb-px flex min-h-11 items-center border-b-2 text-sm font-semibold transition-colors',
                isActive ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
              ].join(' ')
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Suspense fallback={<LoadingScreen />}>
        <Outlet />
      </Suspense>
    </div>
  );
}
