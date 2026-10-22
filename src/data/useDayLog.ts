import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteField, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import type { CatalogFood, ConsumptionEntry, DateId, DayLog, DayTotals, Meal } from '../models';
import { applyStep, totalsOf } from '../lib/nutrition';
import { stableStringify } from '../lib/stableStringify';

export interface DayLogState {
  entries: Record<string, ConsumptionEntry>;
  loading: boolean;
  /** Local changes not yet confirmed by the server (offline, or in flight). */
  pending: boolean;
  error: string | null;
  step: (meal: Meal, food: CatalogFood, direction: 1 | -1) => void;
}

/**
 * Live view of users/{uid}/days/{date} plus the +/− action.
 *
 * - Optimistic: the UI updates on tap; Firestore's local cache applies the write at once and
 *   replays it to the server (also after being offline). If the server rejects it, the cache
 *   rolls back and the listener restores the true value.
 * - Entries are written as merged map fields, so two devices logging different foods don't
 *   overwrite each other. Totals are recomputed from the entries and self-heal if they drift.
 */
export function useDayLog(uid: string, date: DateId): DayLogState {
  const [entries, setEntries] = useState<Record<string, ConsumptionEntry>>({});
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef<Record<string, ConsumptionEntry>>({});

  useEffect(() => {
    setLoading(true);
    setEntries({});
    latest.current = {};
    const ref = doc(db, 'users', uid, 'days', date);
    return onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snap) => {
        const data = snap.data() as DayLog | undefined;
        const next = data?.entries ?? {};
        latest.current = next;
        setEntries(next);
        setPending(snap.metadata.hasPendingWrites);
        setLoading(false);
        setError(null);

        // Self-heal stored totals (e.g. after two devices edited at once).
        if (data && !snap.metadata.hasPendingWrites && !snap.metadata.fromCache) {
          const computed = totalsOf(next).day;
          if (stableStringify(computed) !== stableStringify(data.totals)) {
            void setDoc(ref, { totals: computed, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
          }
        }
      },
      (err) => {
        console.error('Day log listener failed', err);
        setError('Couldn’t load your log for this day.');
        setLoading(false);
      },
    );
  }, [uid, date]);

  const step = useCallback(
    (meal: Meal, food: CatalogFood, direction: 1 | -1) => {
      const result = applyStep(latest.current, meal, food, direction);
      if (result.kind === 'noop') return;

      const next = { ...latest.current };
      if (result.kind === 'set') next[result.key] = result.entry;
      else delete next[result.key];
      latest.current = next;
      setEntries(next);

      const totals: DayTotals = totalsOf(next).day;
      const ref = doc(db, 'users', uid, 'days', date);
      const change = result.kind === 'set' ? result.entry : deleteField();
      // Not awaited: offline, the promise only settles after reconnecting.
      setDoc(ref, { entries: { [result.key]: change }, totals, updatedAt: serverTimestamp() }, { merge: true }).catch((err: unknown) => {
        console.error('Saving a log entry failed', err);
        setError('That change couldn’t be saved and was undone. Check your connection and try again.');
      });
    },
    [uid, date],
  );

  return { entries, loading, pending, error, step };
}
