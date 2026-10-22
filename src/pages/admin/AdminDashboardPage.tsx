import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase/client';
import type { AdminAuditLog } from '../../models';
import { useMessData } from '../../data/MessDataContext';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { WeekSettings } from './WeekSettings';

export default function AdminDashboardPage() {
  const data = useMessData();
  const foods = Object.values(data.foods);
  const unverified = foods.filter((f) => f.verificationStatus !== 'verified').length;

  return (
    <>
      <PageHeader eyebrow="Admin" title="Overview" />

      {!data.ready ? (
        <LoadingScreen />
      ) : (
        <>
          <section className="mt-10">
            <WeekSettings compact />
          </section>

          <div className="mt-12 grid grid-cols-1 border-t border-ink sm:grid-cols-3">
            <Stat term="Foods" value={foods.length} note={`${unverified} with estimated or unreviewed nutrition`} to="/admin/foods" />
            <Stat term="Weekly menus" value={Object.keys(data.menus).length} note="7 days × odd/even = 14" to="/admin/menus?tab=weekly" />
            <Stat term="Date changes" value={Object.keys(data.overrides).length} note="festivals and one-off swaps" to="/admin/menus?tab=dates" />
          </div>

          <AuditTrail />
        </>
      )}
    </>
  );
}

function Stat({ term, value, note, to }: { term: string; value: number; note: string; to: string }) {
  return (
    <Link to={to} className="block border-b border-line py-6 transition-colors hover:bg-hover sm:border-b-0 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0">
      <span className="label block">{term}</span>
      <span className="mt-2 block text-title tabular-nums">{value}</span>
      <span className="mt-1 block text-sm text-muted">{note}</span>
    </Link>
  );
}

const ACTION_LABEL: Record<string, string> = {
  'calendar.update': 'Changed the odd/even calendar',
  'menu.update': 'Published a weekly menu',
  'override.create': 'Added a date change',
  'override.update': 'Edited a date change',
  'override.delete': 'Deleted a date change',
  'food.create': 'Added a food',
  'food.update': 'Edited a food',
  'food.delete': 'Deleted a food',
  'food.seed-overwrite': 'Seed script replaced a food',
  'menu.seed-overwrite': 'Seed script replaced a menu',
};

/** The last 25 admin changes — who, what, when. */
function AuditTrail() {
  const [logs, setLogs] = useState<(AdminAuditLog & { id: string })[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'adminAuditLogs'), orderBy('at', 'desc'), limit(25)),
        (snap) => setLogs(snap.docs.map((d) => ({ id: d.id, ...(d.data({ serverTimestamps: 'estimate' }) as AdminAuditLog) }))),
        (err) => setError(err.message),
      ),
    [],
  );

  return (
    <section className="mt-12 border-t border-ink pt-4">
      <h2 className="label text-ink">Recent changes</h2>
      {error ? <p className="py-3 text-danger">{error}</p> : null}
      {logs === null ? (
        <p className="py-3 text-muted">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="py-3 text-muted">No admin changes yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {logs.map((log) => (
            <li key={log.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <span>
                <span className="font-semibold">{ACTION_LABEL[log.action] ?? log.action}</span>{' '}
                <span className="text-muted">
                  {log.target.collection}/{log.target.id}
                </span>
              </span>
              <span className="shrink-0 text-sm text-muted">
                {log.actorEmail ?? log.actorUid} · {log.at?.toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
