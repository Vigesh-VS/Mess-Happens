import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { X } from 'lucide-react';
import { db } from '../firebase/client';
import { WEIGHT_RANGE_KG, isDateId, type WeightEntry } from '../models';
import { useSignedIn } from '../auth/AuthContext';
import { useMessData } from '../data/MessDataContext';
import { useMessToday } from '../hooks/useMessToday';
import { addDays, formatShortDate } from '../lib/messDate';
import { formatNumber } from '../lib/nutrition';
import { weightChange, type WeightPoint } from '../lib/weightChart';
import { WeightChart } from '../components/WeightChart';
import { Button } from '../components/ui/Button';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { Notice } from '../components/ui/Notice';
import { PageHeader } from '../components/ui/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { TextField } from '../components/ui/TextField';

type Range = '30' | '90' | 'all';

/** Personal weight log (one weigh-in per day) with a line chart. Private to the user. */
export function WeightPage() {
  const { user } = useSignedIn();
  const { timezone } = useMessData();
  const today = useMessToday(timezone);
  const [entries, setEntries] = useState<WeightPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>('30');

  useEffect(
    () =>
      onSnapshot(
        collection(db, 'users', user.uid, 'weights'),
        (snap) => setEntries(snap.docs.map((d) => ({ date: d.id, kg: (d.data() as WeightEntry).kg })).sort((a, b) => b.date.localeCompare(a.date))),
        () => {
          setError('Couldn’t load your weight log.');
          setEntries((e) => e ?? []);
        },
      ),
    [user.uid],
  );

  const shown = useMemo(() => {
    if (!entries) return [];
    if (range === 'all') return entries;
    const from = addDays(today, -(Number(range) - 1));
    return entries.filter((e) => e.date >= from);
  }, [entries, range, today]);

  const latest = entries?.[0];
  const change = weightChange(shown);

  return (
    <>
      <PageHeader eyebrow="Profile" title="Weight" />
      {error ? (
        <div className="mt-6">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      <LogForm uid={user.uid} today={today} />

      {entries === null ? (
        <LoadingScreen />
      ) : entries.length === 0 ? (
        <p className="mt-10 text-lg text-muted">No weigh-ins yet. Add your first one above.</p>
      ) : (
        <>
          <section className="mt-12" aria-labelledby="weight-trend">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="weight-trend" className="label">
                  Latest
                </h2>
                <p className="mt-1 tabular-nums">
                  <span className="text-display">{formatNumber(latest!.kg, 1)}</span>
                  <span className="text-lg text-muted"> kg</span>
                </p>
                <p className="mt-1 text-sm text-muted">
                  {formatShortDate(latest!.date)}
                  {change !== null
                    ? ` · ${change === 0 ? 'no change' : `${change > 0 ? '+' : '−'}${formatNumber(Math.abs(change), 1)} kg`} over ${
                        range === 'all' ? 'all time' : `${range} days`
                      }`
                    : ''}
                </p>
              </div>
              <div className="w-full sm:w-64">
                <Segmented<Range>
                  label="Range"
                  size="sm"
                  value={range}
                  onChange={setRange}
                  options={[
                    { value: '30', label: '30 days' },
                    { value: '90', label: '90 days' },
                    { value: 'all', label: 'All' },
                  ]}
                />
              </div>
            </div>
            <div className="mt-6">
              {shown.length ? <WeightChart points={shown} /> : <p className="py-10 text-muted">No weigh-ins in this range.</p>}
            </div>
          </section>

          <section className="mt-12" aria-labelledby="weight-list">
            <h2 id="weight-list" className="label">
              All weigh-ins
            </h2>
            <ul className="mt-2">
              {entries.map((e) => (
                <li key={e.date} className="flex min-h-12 items-center justify-between gap-4">
                  <span>{formatShortDate(e.date)}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums">{formatNumber(e.kg, 1)} kg</span>
                    <button
                      type="button"
                      onClick={() => void deleteDoc(doc(db, 'users', user.uid, 'weights', e.date)).catch(() => setError('Couldn’t delete that entry.'))}
                      aria-label={`Delete weigh-in of ${formatShortDate(e.date)}`}
                      className="flex size-9 items-center justify-center text-muted hover:bg-hover hover:text-ink"
                    >
                      <X aria-hidden className="size-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}

function LogForm({ uid, today }: { uid: string; today: string }) {
  const [date, setDate] = useState(today);
  const [kg, setKg] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const value = Number(kg.replace(',', '.'));
  const valid = kg.trim() !== '' && Number.isFinite(value) && value >= WEIGHT_RANGE_KG.min && value <= WEIGHT_RANGE_KG.max;
  const dateOk = isDateId(date) && date <= today;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || !dateOk) return;
    const rounded = Math.round(value * 10) / 10;
    // Not awaited: works offline and syncs later; the list updates immediately from the cache.
    setDoc(doc(db, 'users', uid, 'weights', date), { kg: rounded, updatedAt: serverTimestamp() }).catch(() =>
      setMessage({ tone: 'error', text: 'Couldn’t save that weigh-in. Try again.' }),
    );
    setMessage({ tone: 'ok', text: `Saved ${formatNumber(rounded, 1)} kg for ${formatShortDate(date)}.` });
    setKg('');
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8">
      <div className="grid gap-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <TextField
          label="Weight (kg)"
          inputMode="decimal"
          value={kg}
          onChange={(e) => {
            setKg(e.target.value);
            setMessage(null);
          }}
          placeholder="e.g. 68.5"
          error={kg.trim() !== '' && !valid ? `Enter ${WEIGHT_RANGE_KG.min}–${WEIGHT_RANGE_KG.max} kg` : undefined}
        />
        <TextField
          label="Date"
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          error={dateOk ? undefined : 'Pick today or an earlier day.'}
          hint="One weigh-in per day; saving again replaces it."
        />
        <Button type="submit" disabled={!valid || !dateOk}>
          Save
        </Button>
      </div>
      {message ? (
        <p role="status" className={['mt-3 text-sm', message.tone === 'error' ? 'text-danger' : 'font-semibold'].join(' ')}>
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
