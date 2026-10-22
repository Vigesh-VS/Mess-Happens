import { useState, type FormEvent } from 'react';
import { serverTimestamp, updateDoc } from 'firebase/firestore';
import type { NutritionTargets } from '../models';
import { userDoc } from '../auth/profile';
import { DEFAULT_TARGETS, NUTRIENTS } from '../lib/nutrition';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';

const MAX: Record<keyof NutritionTargets, number> = { kcal: 10000, protein_g: 1000, carbohydrates_g: 2000, fat_g: 1000, fiber_g: 500 };

export function TargetsForm({ uid, current }: { uid: string; current: NutritionTargets | null }) {
  const initial = current ?? DEFAULT_TARGETS;
  const [values, setValues] = useState<Record<keyof NutritionTargets, string>>(
    () => Object.fromEntries(NUTRIENTS.map((n) => [n.key, String(initial[n.key])])) as Record<keyof NutritionTargets, string>,
  );
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const errors = Object.fromEntries(
    NUTRIENTS.map((n) => {
      const v = Number(values[n.key]);
      const bad = values[n.key].trim() === '' || !Number.isFinite(v) || v < 0 || v > MAX[n.key];
      return [n.key, bad ? `0 – ${MAX[n.key]}` : undefined];
    }),
  ) as Record<keyof NutritionTargets, string | undefined>;
  const valid = NUTRIENTS.every((n) => !errors[n.key]);

  async function write(targets: NutritionTargets | null, text: string) {
    setBusy(true);
    setMessage(null);
    try {
      // Offline, this resolves once synced; the local cache shows the new targets immediately.
      await updateDoc(userDoc(uid), { targets, updatedAt: serverTimestamp() });
      setMessage({ tone: 'ok', text });
    } catch {
      setMessage({ tone: 'error', text: 'Couldn’t save your targets. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const targets = Object.fromEntries(NUTRIENTS.map((n) => [n.key, Number(values[n.key])])) as unknown as NutritionTargets;
    void write(targets, 'Targets saved.');
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-10 border-t border-ink pt-4">
      <h2 className="text-title">Daily calorie target</h2>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Summary compares what you eat against this, so you can see if a day was light or heavy.
        {current ? '' : ' Showing defaults — general guidance, not personal or medical advice.'}
      </p>
      <div className="mt-6 max-w-xs">
        <TextField
          label="Calories per day (kcal)"
          inputMode="decimal"
          value={values.kcal}
          onChange={(e) => setValues((v) => ({ ...v, kcal: e.target.value }))}
          error={errors.kcal}
          className="[&_input]:text-display [&_input]:min-h-16"
        />
      </div>
      <p className="label mt-10">Other targets (optional)</p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {NUTRIENTS.filter((n) => n.key !== 'kcal').map((n) => (
          <TextField
            key={n.key}
            label={`${n.label} (${n.unit})`}
            inputMode="decimal"
            value={values[n.key]}
            onChange={(e) => setValues((v) => ({ ...v, [n.key]: e.target.value }))}
            error={errors[n.key]}
          />
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" busy={busy} disabled={!valid}>
          Save targets
        </Button>
        {current ? (
          <Button
            variant="quiet"
            disabled={busy}
            onClick={() => {
              setValues(Object.fromEntries(NUTRIENTS.map((n) => [n.key, String(DEFAULT_TARGETS[n.key])])) as Record<keyof NutritionTargets, string>);
              void write(null, 'Back to the default targets.');
            }}
          >
            Use defaults
          </Button>
        ) : null}
        {message ? (
          <p role="status" className={['text-sm', message.tone === 'error' ? 'text-danger' : 'font-semibold'].join(' ')}>
            {message.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
