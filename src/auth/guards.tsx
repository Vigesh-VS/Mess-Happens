import type { ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuth } from './AuthContext';

/** Signed-in users only; others go to /login and come back afterwards. */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();
  if (state.status === 'loading') return <LoadingScreen />;
  if (state.status === 'signedOut') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children ?? <Outlet />}</>;
}

/** Login/sign-up screens: bounce signed-in users to where they were going. */
export function PublicOnly() {
  const { state } = useAuth();
  const location = useLocation();
  if (state.status === 'loading') return <LoadingScreen />;
  if (state.status === 'signedIn') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== '/login' ? from : '/'} replace />;
  }
  return <Outlet />;
}

/**
 * Hides admin screens from non-admins. This is convenience only — every admin
 * write is enforced by Firestore Security Rules against the `admin` claim.
 */
export function RequireAdmin() {
  const { state } = useAuth();
  if (state.status !== 'signedIn') return <LoadingScreen />;
  if (!state.isAdmin) {
    return (
      <div>
        <PageHeader eyebrow="Admin" title="No access" />
        <p className="mt-6 max-w-prose text-lg text-muted">
          This area is for mess administrators. If you were just made an admin, sign out and sign in again.{' '}
          <Link to="/" className="text-ink underline underline-offset-4">
            Back to the menu
          </Link>
        </p>
      </div>
    );
  }
  return <Outlet />;
}

/**
 * New accounts set up their profile (name, weight, targets) before anything else.
 * Admin screens are exempt so an admin can always reach them.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();
  const needsSetup = state.status === 'signedIn' && state.profile !== null && state.profile.targets === null;
  if (needsSetup && location.pathname !== '/setup' && !location.pathname.startsWith('/admin')) {
    return <Navigate to="/setup" replace />;
  }
  return <>{children}</>;
}
