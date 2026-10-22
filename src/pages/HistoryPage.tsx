import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { collection, documentId, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/client';
import type { DateId, DayLog, DayTotals } from '../models';
import { useSignedIn } from '../auth/AuthContext';
import { useMessData } from '../data/MessDataContext';
import { useMessToday } from '../hooks/useMessToday';
import { addDays, formatShortDate, messDateOf } from '../lib/messDate';
import { formatNumber, totalsOf } from '../lib/nutrition';
import { Button } from '../components/ui/Button';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { Notice } from '../components/ui/Notice';
import { PageHeader } from '../components/ui/PageHeader';

/** Days per "page". Day ids are dates, so a page is a date range (ascending key scan). */
const WINDOW = 60;

interface Row {
  date: DateId;
  totals: DayTotals;
  items: number;
}

/** One read per logged day. Totals come from each day's frozen snapshots, so food edits never change them. */
export function HistoryPage() {
  const { user, profile } = useSignedIn();
  const { timezone } = useMessData();
  const today = useMessToday(timezone);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [oldestLoaded, setOldestLoaded] = useState<DateId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nothing can be older than the account itself.
  const firstDay = profile?.createdAt ? messDateOf(profile.createdAt.toDate(), timezone) : null;

  const load = useCallback(
    async (to: DateId) => {
      setBusy(true);
      const from = addDays(to, -(WINDOW - 1));
      try {
        const snap = await getDocs(query(collection(db, 'users', user.uid, 'days'), where(documentId(), '>=', from), where(documentId(), '<=', to)));
        const page = snap.docs
          .map((d) => {
            const entries = (d.data() as DayLog).entries ?? {};
            return { date: d.id, totals: totalsOf(entries).day, items: Object.values(entries).filter((e) => e.quantity > 0).length };
          })
          .filter((r) => r.items > 0)
          .reverse();
        setRows((prev) => [...(prev ?? []).filter((r) => r.date > to), ...page]);
        setOldestLoaded(from);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Couldn’t load your history. Check your connection.');
        setRows((prev) => prev ?? []);
      } finally {
        setBusy(false);
      }
    },
    [user.uid],
  );

  useEffect(() => {
    setRows(null);
    void load(today);
  }, [load, today]);

  const hasMore = oldestLoaded !== null && (firstDay === null || oldestLoaded > firstDay);

  return (
    <>
      <PageHeader eyebrow="Past days" title="History" />
      {error ? (
        <div className="mt-6">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
      {rows === null ? (
        <LoadingScreen />
      ) : (
        <>
          {rows.length === 0 ? (
            <p className="mt-8 text-lg text-muted">
              No logged days {oldestLoaded ? `since ${formatShortDate(oldestLoaded)}` : 'yet'}. Use + on the Today screen to record what you eat.
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-line">
              {rows.map((r) => (
                <li key={r.date}>
                  <Link to={`/summary?date=${r.date}`} className="flex min-h-16 items-center justify-between gap-4 py-3 hover:bg-hover">
                    <span>
                      <span className="block text-lg font-semibold">{formatShortDate(r.date)}</span>
                      <span className="block text-sm text-muted">
                        {r.items} item{r.items === 1 ? '' : 's'} · P {formatNumber(r.totals.protein_g)} g · C {formatNumber(r.totals.carbohydrates_g)} g · F{' '}
                        {formatNumber(r.totals.fat_g)} g
                      </span>
                    </span>
                    <span className="shrink-0 text-title tabular-nums">
                      {formatNumber(r.totals.kcal)}
                      <span className="text-sm font-normal text-muted"> kcal</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {hasMore ? (
            <div className="mt-6">
              <Button variant="secondary" busy={busy} onClick={() => oldestLoaded && void load(addDays(oldestLoaded, -1))}>
                Load older days
              </Button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
