import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { collection, doc, getCountFromServer, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/client';
import type { AcademicCalendar } from '../../models';
import { Notice } from '../../components/ui/Notice';
import { PageHeader } from '../../components/ui/PageHeader';

interface Overview {
  foods: number;
  menus: number;
  overrides: number;
  calendar: AcademicCalendar | null;
}

/** Read-only health check of the seeded data. Needs a connection (counts come from the server). */
export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCountFromServer(collection(db, 'foods')),
      getCountFromServer(collection(db, 'menus')),
      getCountFromServer(collection(db, 'menuOverrides')),
      getDoc(doc(db, 'config', 'academicCalendar')),
    ])
      .then(([foods, menus, overrides, calendar]) => {
        if (cancelled) return;
        setOverview({
          foods: foods.data().count,
          menus: menus.data().count,
          overrides: overrides.data().count,
          calendar: calendar.exists() ? (calendar.data() as AcademicCalendar) : null,
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Overview" />
      {error ? (
        <div className="mt-8">
          <Notice tone="error" title="Could not load the overview">
            {error}. This screen needs a connection.
          </Notice>
        </div>
      ) : null}

      <dl className="mt-8 grid grid-cols-1 border-t border-line sm:grid-cols-3">
        <Stat term="Foods" value={overview?.foods} expected="162 seeded" />
        <Stat term="Weekly menus" value={overview?.menus} expected="14 = 7 days × odd/even" />
        <Stat term="Date overrides" value={overview?.overrides} />
      </dl>

      <section className="mt-10">
        <p className="label">Academic calendar</p>
        {overview === null ? (
          <p className="mt-3 text-muted">—</p>
        ) : overview.calendar ? (
          <p className="mt-3 text-lg">
            {overview.calendar.referenceDate} is in an <strong>{overview.calendar.referenceParity}</strong> week · weeks start on{' '}
            {overview.calendar.weekStartsOn} · {overview.calendar.timezone}
          </p>
        ) : (
          <div className="mt-3">
            <Notice title="Menu week not configured">
              Students can’t see the right odd/even menu until a reference date is set. The setting arrives in the{' '}
              <Link to="/admin/menus" className="text-ink underline underline-offset-4">
                Menu Editor
              </Link>{' '}
              (Phase 2).
            </Notice>
          </div>
        )}
      </section>
    </>
  );
}

function Stat({ term, value, expected }: { term: string; value: number | undefined; expected?: string }) {
  return (
    <div className="border-b border-line py-6 sm:border-b-0 sm:border-r sm:pr-6 sm:last:border-r-0 sm:[&:not(:first-child)]:pl-6">
      <dt className="label">{term}</dt>
      <dd className="mt-2 text-title">{value ?? '—'}</dd>
      {expected ? <dd className="mt-1 text-sm text-muted">{expected}</dd> : null}
    </div>
  );
}
