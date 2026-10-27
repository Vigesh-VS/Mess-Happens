import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { collection, doc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import { WEIGHT_RANGE_KG, type BodyDetails, type NutritionTargets } from '../models';
import { useSignedIn } from '../auth/AuthContext';
import { userDoc } from '../auth/profile';
import { useMessData } from '../data/MessDataContext';
import { useMessToday } from '../hooks/useMessToday';
import { ACTIVITY, GOALS, bmi, bmiCategory, goalFor, maintenanceKcal, suggestTargets, weeksToTarget } from '../lib/energy';
import { NUTRIENTS, formatNumber } from '../lib/nutrition';
import { Brand } from '../components/Brand';
import { Button } from '../components/ui/Button';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { Notice } from '../components/ui/Notice';
import { PageHeader } from '../components/ui/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { TextField } from '../components/ui/TextField';

type TargetKey = keyof NutritionTargets;
const LIMITS: Record<TargetKey, number> = { kcal: 10000, protein_g: 1000, carbohydrates_g: 2000, fat_g: 1000, fiber_g: 500 };

const num = (s: string) => Number(s.replace(',', '.'));
const inRange = (s: string, min: number, max: number) => s.trim() !== '' && Number.isFinite(num(s)) && num(s) >= min && num(s) <= max;

/**
 * "Targets & body details" inside the app (from Profile). First-time setup is the standalone
 * `/welcome` page instead.
 */
export function SetupPage() {
  const { profile } = useSignedIn();
  if (!profile) return <LoadingScreen />;
  return <SetupForm key={profile.createdAt?.toMillis?.() ?? 0} />;
}

/**
 * First-run setup on its own page — just the app name at the top, no navigation. Asks for
 * current and target weight and body details, estimates the daily targets from them, and
 * opens the app once saved.
 */
export function WelcomePage() {
  const { profile } = useSignedIn();
  if (!profile) return <LoadingScreen />;
  if (profile.targets) return <Navigate to="/" replace />;
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10 sm:px-8">
      <header className="flex justify-center border-b border-line pb-8">
        <Brand />
      </header>
      <div className="mt-10">
        <SetupForm key={profile.createdAt?.toMillis?.() ?? 0} standalone />
      </div>
    </main>
  );
}

function SetupForm({ standalone = false }: { standalone?: boolean }) {
  const { user, profile } = useSignedIn();
  const { timezone } = useMessData();
  const today = useMessToday(timezone);
  const navigate = useNavigate();
  const firstTime = !profile?.targets;

  const [name, setName] = useState(profile?.displayName ?? '');
  const [weight, setWeight] = useState('');
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [height, setHeight] = useState(profile?.body ? String(profile.body.heightCm) : '');
  const [age, setAge] = useState(profile?.body ? String(profile.body.age) : '');
  const [sex, setSex] = useState<BodyDetails['sex']>(profile?.body?.sex ?? 'male');
  const [activity, setActivity] = useState<BodyDetails['activity']>(profile?.body?.activity ?? 'light');
  const [targetWeight, setTargetWeight] = useState(profile?.body?.targetWeightKg ? String(profile.body.targetWeightKg) : '');
  const [targets, setTargets] = useState<Record<TargetKey, string>>(() =>
    Object.fromEntries(NUTRIENTS.map((n) => [n.key, profile?.targets ? String(profile.targets[n.key]) : ''])) as Record<TargetKey, string>,
  );
  // First time, targets follow the calculator until the user types their own.
  const [targetsEdited, setTargetsEdited] = useState(!firstTime);
  const editTarget = (key: TargetKey, value: string) => {
    setTargetsEdited(true);
    setTargets((t) => ({ ...t, [key]: value }));
  };
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Go to Today once the new targets are in the local profile — otherwise the onboarding
  // redirect would still see "no targets" and send the user back here.
  useEffect(() => {
    if (saved && profile?.targets) navigate('/', { replace: true });
  }, [saved, profile?.targets, navigate]);

  // Prefill the current weight from the latest weigh-in.
  useEffect(() => {
    getDocs(collection(db, 'users', user.uid, 'weights'))
      .then((snap) => {
        const latest = snap.docs.map((d) => ({ date: d.id, kg: d.data().kg as number })).sort((a, b) => b.date.localeCompare(a.date))[0];
        if (latest) {
          setLatestWeight(latest.kg);
          setWeight((w) => w || String(latest.kg));
        }
      })
      .catch(() => {});
  }, [user.uid]);

  const weightOk = inRange(weight, WEIGHT_RANGE_KG.min, WEIGHT_RANGE_KG.max);
  const heightOk = inRange(height, 100, 250);
  const ageOk = inRange(age, 10, 100) && Number.isInteger(num(age));
  const targetWeightOk = targetWeight === '' || inRange(targetWeight, WEIGHT_RANGE_KG.min, WEIGHT_RANGE_KG.max);
  const targetKg = targetWeight !== '' && targetWeightOk ? Math.round(num(targetWeight) * 10) / 10 : undefined;
  const goal = weightOk ? goalFor(num(weight), targetKg) : 'maintain';
  const bodyComplete = weightOk && heightOk && ageOk && targetWeightOk;
  const body: BodyDetails | null = bodyComplete
    ? { heightCm: num(height), age: num(age), sex, activity, goal, ...(targetKg !== undefined ? { targetWeightKg: targetKg } : {}) }
    : null;
  const suggested = body ? suggestTargets(num(weight), body) : null;
  const weeks = body ? weeksToTarget(num(weight), body) : null;
  const suggestedKey = suggested ? NUTRIENTS.map((n) => suggested[n.key]).join() : '';

  useEffect(() => {
    if (targetsEdited || !suggestedKey) return;
    const values = suggestedKey.split(',');
    setTargets(Object.fromEntries(NUTRIENTS.map((n, i) => [n.key, values[i]!])) as Record<TargetKey, string>);
  }, [targetsEdited, suggestedKey]);
  const targetErrors = Object.fromEntries(
    NUTRIENTS.map((n) => [n.key, inRange(targets[n.key], n.key === 'kcal' ? 500 : 0, LIMITS[n.key]) ? undefined : n.key === 'kcal' ? '500 – 10,000' : `0 – ${LIMITS[n.key]}`]),
  ) as Record<TargetKey, string | undefined>;
  // First time, everything the estimate needs is required; later edits may leave body details out.
  const detailsOk = firstTime ? heightOk && ageOk && targetWeight !== '' && targetWeightOk : targetWeightOk && (height === '' || heightOk) && (age === '' || ageOk);
  const valid = name.trim().length > 0 && weightOk && detailsOk && NUTRIENTS.every((n) => !targetErrors[n.key]);

  function applySuggested() {
    if (!suggested) return;
    setTargetsEdited(false);
    setTargets(Object.fromEntries(NUTRIENTS.map((n) => [n.key, String(suggested[n.key])])) as Record<TargetKey, string>);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setShowErrors(true);
    if (!valid) return;
    setBusy(true);
    setError(null);
    const kg = Math.round(num(weight) * 10) / 10;
    const saved = Object.fromEntries(NUTRIENTS.map((n) => [n.key, num(targets[n.key])])) as unknown as NutritionTargets;
    // Not awaited: works offline (queued) and the profile updates locally at once.
    updateDoc(userDoc(user.uid), { displayName: name.trim().slice(0, 80), targets: saved, body, updatedAt: serverTimestamp() }).catch(() =>
      setError('Couldn’t save your profile. Check your connection and try again.'),
    );
    if (kg !== latestWeight) {
      setDoc(doc(db, 'users', user.uid, 'weights', today), { kg, updatedAt: serverTimestamp() }).catch(() => {});
    }
    setSaved(true);
  }

  const err = (cond: boolean, msg: string) => (showErrors && !cond ? msg : undefined);

  return (
    <>
      <PageHeader eyebrow={firstTime ? 'Welcome' : 'Profile'} title={firstTime ? 'Set up' : 'Targets'} />
      {firstTime ? (
        <p className="mt-6 max-w-prose text-lg text-muted">
          Tell us a little about you and we’ll work out your daily calories and protein. You can change all of this later in Profile.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-14">
        <section className="space-y-6">
          <h2 className="text-title">You</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField label="Name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} error={err(name.trim().length > 0, 'Required.')} />
            <TextField
              label="Current weight (kg)"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 68.5"
              error={err(weightOk, `Enter ${WEIGHT_RANGE_KG.min}–${WEIGHT_RANGE_KG.max} kg`)}
            />
            <TextField
              label="Target weight (kg)"
              inputMode="decimal"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              placeholder="e.g. 65"
              hint={firstTime ? 'Same as current weight to maintain.' : 'Leave empty to stay at your current weight.'}
              error={
                !targetWeightOk || (firstTime && showErrors && targetWeight === '') ? `Enter ${WEIGHT_RANGE_KG.min}–${WEIGHT_RANGE_KG.max} kg` : undefined
              }
            />
          </div>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="text-title">{firstTime ? 'About you' : 'Your calories'}</h2>
            <p className="mt-2 max-w-prose text-sm text-muted">Used to estimate the calories you burn in a day and what to eat to reach your target weight.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField label="Height (cm)" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 170" error={(height || (firstTime && showErrors)) && !heightOk ? '100–250 cm' : undefined} />
            <TextField label="Age" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 20" error={(age || (firstTime && showErrors)) && !ageOk ? '10–100' : undefined} />
          </div>
          <div>
            <p className="label mb-2">Sex</p>
            <Segmented label="Sex" value={sex} onChange={setSex} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
          </div>
          <div>
            <p className="label mb-2">Activity</p>
            <Segmented label="Activity" size="sm" value={activity} onChange={setActivity} options={Object.entries(ACTIVITY).map(([value, a]) => ({ value: value as BodyDetails['activity'], label: a.label }))} />
            <p className="mt-2 text-sm text-muted">{ACTIVITY[activity].hint}</p>
          </div>

          {body ? (
            <div className="rounded-sm border border-line px-4 py-4">
              <div className="flex flex-wrap gap-x-10 gap-y-3 tabular-nums">
                <p>
                  <span className="label block">Maintenance</span>
                  <span className="text-title">{formatNumber(Math.round(maintenanceKcal(num(weight), body) / 10) * 10)}</span>
                  <span className="text-muted"> kcal/day</span>
                </p>
                <p>
                  <span className="label block">BMI</span>
                  <span className="text-title">{formatNumber(bmi(num(weight), body.heightCm), 1)}</span>
                  <span className="text-muted"> {bmiCategory(bmi(num(weight), body.heightCm))}</span>
                </p>
                <p>
                  <span className="label block">To {GOALS[goal].label.toLowerCase()}</span>
                  <span className="text-title">{formatNumber(suggested!.kcal)}</span>
                  <span className="text-muted"> kcal/day</span>
                </p>
                <p>
                  <span className="label block">Protein</span>
                  <span className="text-title">{formatNumber(suggested!.protein_g)}</span>
                  <span className="text-muted"> g/day</span>
                </p>
              </div>
              {weeks !== null ? (
                <p className="mt-3 text-sm text-muted">
                  {formatNumber(Math.abs(body.targetWeightKg! - num(weight)), 1)} kg to {goal === 'lose' ? 'lose' : 'gain'} — about {weeks} weeks at this rate.
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                {targetsEdited ? (
                  <Button variant="secondary" onClick={applySuggested}>
                    Use this estimate
                  </Button>
                ) : (
                  <p className="text-sm font-semibold">✓ Using this estimate — or type your own targets below.</p>
                )}
                <p className="text-xs text-muted">An estimate (Mifflin–St Jeor) — not medical advice.</p>
              </div>
            </div>
          ) : firstTime ? (
            <p className="rounded-sm border border-dashed border-line px-4 py-4 text-sm text-muted">
              Fill in your weights, height and age to see your estimated calories and protein.
            </p>
          ) : null}
        </section>

        <section className="space-y-6">
          <h2 className="text-title">Daily targets</h2>
          <div className="max-w-xs">
            <TextField
              label="Calories (kcal)"
              inputMode="decimal"
              value={targets.kcal}
              onChange={(e) => editTarget('kcal', e.target.value)}
              error={showErrors ? targetErrors.kcal : undefined}
              className="[&_input]:min-h-16 [&_input]:text-display"
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {NUTRIENTS.filter((n) => n.key !== 'kcal').map((n) => (
              <TextField
                key={n.key}
                label={`${n.label} (${n.unit})`}
                inputMode="decimal"
                value={targets[n.key]}
                onChange={(e) => editTarget(n.key, e.target.value)}
                error={showErrors ? targetErrors[n.key] : undefined}
              />
            ))}
          </div>
        </section>

        {error ? <Notice tone="error">{error}</Notice> : null}
        <div
          className={
            standalone ? 'flex flex-col gap-3 border-t border-line pt-8' : 'sticky bottom-16 z-10 flex items-center gap-4 bg-paper py-4 lg:bottom-0'
          }
        >
          <Button type="submit" busy={busy} block={standalone}>
            Save
          </Button>
          {showErrors && !valid ? <p className="text-sm text-danger">Fill in the highlighted fields.</p> : null}
        </div>
      </form>
    </>
  );
}
