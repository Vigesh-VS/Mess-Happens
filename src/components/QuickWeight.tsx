import { useState, type FormEvent } from 'react';
import { Check, Scale } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import { WEIGHT_RANGE_KG, type DateId } from '../models';
import { useWeights } from '../data/useWeights';
import { Button } from './ui/Button';

/**
 * "Log weight" under the day arrows on Today: one tap opens a small box to save today's
 * weigh-in. A tick shows once today's weight is logged; tapping again changes it.
 */
export function QuickWeight({ uid, today }: { uid: string; today: DateId }) {
  const weights = useWeights(uid);
  const logged = weights?.find((w) => w.date === today)?.kg ?? null;
  const [open, setOpen] = useState(false);
  const [kg, setKg] = useState('');
  const [error, setError] = useState<string | null>(null);

  const value = Number(kg.replace(',', '.'));
  const valid = kg.trim() !== '' && Number.isFinite(value) && value >= WEIGHT_RANGE_KG.min && value <= WEIGHT_RANGE_KG.max;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const rounded = Math.round(value * 10) / 10;
    // Not awaited: works offline and syncs later; the value updates at once from the cache.
    setDoc(doc(db, 'users', uid, 'weights', today), { kg: rounded, updatedAt: serverTimestamp() }).catch(() =>
      setError('Couldn’t save your weight. Try again.'),
    );
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setKg(logged !== null ? String(logged) : '');
          setError(null);
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className="flex min-h-11 items-center gap-2 border border-line px-3 text-sm font-semibold transition-colors hover:bg-hover"
      >
        <Scale aria-hidden className="size-4" />
        Log weight
        {logged !== null ? <Check aria-label="logged today" className="size-4" /> : null}
      </button>

      {open ? (
        <form onSubmit={handleSubmit} noValidate className="absolute right-0 top-full z-20 mt-2 w-60 border border-ink bg-paper p-4 shadow-sm">
          <label className="label block" htmlFor="quick-weight">
            Today’s weight (kg)
          </label>
          <input
            id="quick-weight"
            autoFocus
            inputMode="decimal"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            placeholder="e.g. 68.5"
            className="mt-2 min-h-11 w-full border-b border-ink bg-transparent text-lg outline-none"
          />
          {kg.trim() !== '' && !valid ? <p className="mt-1 text-xs text-danger">Enter {WEIGHT_RANGE_KG.min}–{WEIGHT_RANGE_KG.max} kg</p> : null}
          <div className="mt-3 flex items-center gap-3">
            <Button type="submit" disabled={!valid}>
              Save
            </Button>
            <button type="button" onClick={() => setOpen(false)} className="min-h-11 text-sm text-muted hover:text-ink">
              Cancel
            </button>
          </div>
        </form>
      ) : null}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
