import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronRight, LogOut, RefreshCw } from 'lucide-react';
import { useSignedIn } from '../auth/AuthContext';
import { useWeights } from '../data/useWeights';
import { formatShortDate } from '../lib/messDate';
import { formatNumber } from '../lib/nutrition';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { InstallHint } from './InstallHint';

/** Name, current weight, targets, and sign out. Admin tools only for admins. */
export function ProfilePage() {
  const { user, profile, isAdmin, refreshClaims, signOut } = useSignedIn();
  const navigate = useNavigate();
  const weights = useWeights(user.uid);
  const latest = weights?.[0];
  const [refreshing, setRefreshing] = useState(false);

  return (
    <>
      <PageHeader eyebrow="Profile" title={profile?.displayName ?? user.displayName ?? 'Profile'} />

      <div className="mt-8 flex flex-wrap gap-x-12 gap-y-6">
        <div>
          <p className="label">Current weight</p>
          <p className="mt-1 tabular-nums">
            {latest ? (
              <>
                <span className="text-display">{formatNumber(latest.kg, 1)}</span>
                <span className="text-lg text-muted"> kg</span>
              </>
            ) : (
              <span className="text-lg text-muted">Not logged yet</span>
            )}
          </p>
          {latest ? <p className="mt-1 text-sm text-muted">{formatShortDate(latest.date)}</p> : null}
        </div>
        {profile?.targets ? (
          <div>
            <p className="label">Daily target</p>
            <p className="mt-1 tabular-nums">
              <span className="text-display">{formatNumber(profile.targets.kcal)}</span>
              <span className="text-lg text-muted"> kcal</span>
            </p>
          </div>
        ) : null}
      </div>

      <nav aria-label="Profile" className="mt-10 border-t border-line">
        <Item to="/weight">Weight log</Item>
        <Item to="/setup">Targets &amp; body details</Item>
        {isAdmin ? <Item to="/admin">Admin dashboard</Item> : null}
      </nav>

      <InstallHint />

      <div className="mt-10 flex flex-wrap gap-3">
        <Button
          variant="secondary"
          icon={<LogOut aria-hidden className="size-4" />}
          onClick={() => {
            navigate('/'); // land on the public menu, not the sign-in page
            void signOut();
          }}
        >
          Sign out
        </Button>
        {isAdmin ? (
          <Button
            variant="quiet"
            icon={<RefreshCw aria-hidden className="size-4" />}
            busy={refreshing}
            onClick={async () => {
              setRefreshing(true);
              try {
                await refreshClaims();
              } finally {
                setRefreshing(false);
              }
            }}
          >
            Refresh access
          </Button>
        ) : null}
      </div>
      <p className="mt-6 text-sm text-muted">{user.email}</p>
    </>
  );
}

function Item({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="flex min-h-14 items-center justify-between border-b border-line text-lg font-semibold transition-colors hover:bg-hover">
      {children}
      <ChevronRight aria-hidden className="size-5" />
    </Link>
  );
}
