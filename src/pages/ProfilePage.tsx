import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { serverTimestamp, updateDoc } from 'firebase/firestore';
import { ChevronRight, LogOut, RefreshCw } from 'lucide-react';
import { useSignedIn } from '../auth/AuthContext';
import { userDoc } from '../auth/profile';
import { Button } from '../components/ui/Button';
import { ComingInPhase } from '../components/ui/ComingInPhase';
import { Notice } from '../components/ui/Notice';
import { PageHeader } from '../components/ui/PageHeader';
import { TextField } from '../components/ui/TextField';

export function ProfilePage() {
  const { user, profile, isAdmin, refreshClaims, signOut } = useSignedIn();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshClaims();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Account" title={profile?.displayName ?? user.displayName ?? 'Profile'} />

      <dl className="mt-8 divide-y divide-line border-b border-line">
        <Row term="Email">{user.email ?? '—'}</Row>
        <Row term="Role">{isAdmin ? 'Administrator' : 'Student'}</Row>
      </dl>

      {isAdmin ? (
        <Link
          to="/admin"
          className="flex min-h-14 items-center justify-between border-b border-line text-lg font-semibold transition-colors hover:bg-hover"
        >
          Admin dashboard
          <ChevronRight aria-hidden className="size-5" />
        </Link>
      ) : null}

      {profile ? <NameForm key={profile.displayName} uid={user.uid} current={profile.displayName} /> : null}

      <ComingInPhase phase={4}>Personal daily targets for calories, protein, carbohydrates, fat and fiber.</ComingInPhase>

      <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6">
        <Button variant="secondary" icon={<RefreshCw aria-hidden className="size-4" />} busy={refreshing} onClick={handleRefresh}>
          Refresh access
        </Button>
        <Button variant="secondary" icon={<LogOut aria-hidden className="size-4" />} onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </>
  );
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4">
      <dt className="label">{term}</dt>
      <dd className="min-w-0 truncate text-right">{children}</dd>
    </div>
  );
}

function NameForm({ uid, current }: { uid: string; current: string }) {
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await updateDoc(userDoc(uid), { displayName: trimmed, updatedAt: serverTimestamp() });
    } catch {
      setError('Could not save your name. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
      <TextField label="Display name" className="flex-1" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      <Button type="submit" variant="secondary" busy={busy} disabled={!trimmed || trimmed === current}>
        Save
      </Button>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </form>
  );
}
