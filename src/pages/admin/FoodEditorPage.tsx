import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase/client';
import {
  FOOD_CATEGORIES,
  SERVING_UNITS,
  VERIFICATION_STATUSES,
  type CatalogFood,
  type FoodHistoryEntry,
  type VerificationStatus,
} from '../../models';
import { useMessData } from '../../data/MessDataContext';
import { deleteFood, saveFood, slugify } from '../../data/adminWrites';
import { foodUsage } from '../../lib/menu';
import { formatNumber, formatQuantity, perServing } from '../../lib/nutrition';
import { Button } from '../../components/ui/Button';
import { ConfirmAction } from '../../components/ui/ConfirmAction';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Notice } from '../../components/ui/Notice';
import { PageHeader } from '../../components/ui/PageHeader';
import { TextField } from '../../components/ui/TextField';
import { EMPTY_FORM, formFromFood, nutritionChanged, validateFoodForm, type FoodFormState } from './foodForm';
import { SaveStatusLine } from './SaveStatusLine';
import { useActor, useSave } from './useAdmin';

const STATUS_LABEL: Record<VerificationStatus, string> = { estimated: 'Estimated', 'needs-review': 'Needs review', verified: 'Verified' };

export default function FoodEditorPage() {
  const data = useMessData();
  const [params, setParams] = useSearchParams();
  const selected = params.get('food');

  if (!data.ready) return <LoadingScreen />;
  if (selected) {
    const food = selected === 'new' ? null : data.foods[selected];
    if (selected !== 'new' && !food) {
      return (
        <>
          <PageHeader eyebrow="Admin · Foods" title="Not found" />
          <p className="mt-6 text-muted">
            No food with id “{selected}”. <Link to="/admin/foods" className="text-ink underline underline-offset-4">Back to foods</Link>
          </p>
        </>
      );
    }
    return <FoodForm key={selected} food={food ?? null} onClose={() => setParams({})} onCreated={(id) => setParams({ food: id })} />;
  }
  return <FoodList onOpen={(id) => setParams({ food: id })} />;
}

// ---------- list ----------

function FoodList({ onOpen }: { onOpen: (id: string) => void }) {
  const { foods } = useMessData();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return Object.values(foods)
      .filter((f) => !term || f.name.toLowerCase().includes(term) || f.id.includes(term))
      .filter((f) => !category || f.category === category)
      .filter((f) => !status || f.verificationStatus === status)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [foods, q, category, status]);

  const select = 'min-h-11 border border-ink bg-paper px-2 text-sm';
  return (
    <>
      <PageHeader eyebrow="Admin" title="Foods" actions={<Button onClick={() => onOpen('new')}>New food</Button>} />
      <p className="mt-6 max-w-prose text-muted">
        Edits publish to everyone immediately. Logs people already made keep the values they were logged with.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search foods"
          aria-label="Search foods"
          className="min-h-11 border-0 border-b border-ink bg-transparent px-0 text-lg outline-none"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={select} aria-label="Category">
          <option value="">All categories</option>
          {FOOD_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={select} aria-label="Verification">
          <option value="">Any status</option>
          {VERIFICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-6 text-sm text-muted">{list.length} foods</p>
      <ul className="mt-2 divide-y divide-line border-t border-ink">
        {list.map((f) => (
          <li key={f.id}>
            <button type="button" onClick={() => onOpen(f.id)} className="flex min-h-16 w-full items-center justify-between gap-4 py-2 text-left hover:bg-hover">
              <span className="min-w-0">
                <span className="block truncate text-lg font-semibold">{f.name}</span>
                <span className="block text-sm text-muted">
                  {f.category} · {formatQuantity(f.servingSize, f.servingUnit)} · {formatNumber(perServing(f).kcal)} kcal
                </span>
              </span>
              <span className={['shrink-0 text-xs', f.verificationStatus === 'verified' ? 'font-semibold text-ink' : 'text-muted'].join(' ')}>
                {STATUS_LABEL[f.verificationStatus]} · v{f.version}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

// ---------- form ----------

function FoodForm({ food, onClose, onCreated }: { food: CatalogFood | null; onClose: () => void; onCreated: (id: string) => void }) {
  const data = useMessData();
  const actor = useActor();
  const { status, run } = useSave();
  const [form, setForm] = useState<FoodFormState>(food ? formFromFood(food) : EMPTY_FORM);
  const [showErrors, setShowErrors] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const isNew = food === null;

  // If another admin saves this food while it's open, tell the user rather than silently diverging.
  const [startVersion] = useState(food?.version);
  const live = food ? data.foods[food.id] : undefined;
  const changedElsewhere = !isNew && live && live.version !== startVersion && status.kind !== 'saving' && status.kind !== 'saved';

  const { input, errors } = validateFoodForm(form);
  const id = isNew ? slugify(form.name) : food.id;
  const duplicate = useMemo(() => {
    const name = form.name.trim().toLowerCase();
    return Object.values(data.foods).find((f) => f.id !== food?.id && (f.name.toLowerCase() === name || (isNew && f.id === id)));
  }, [data.foods, form.name, food, isNew, id]);
  const usage = food ? foodUsage(food.id, data.menus, data.overrides, data.specials) : [];
  const affectsNutrition = !isNew && input !== null && nutritionChanged(food, input);

  const set = <K extends keyof FoodFormState>(key: K, value: FoodFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setConfirming(false);
  };
  const err = (key: keyof FoodFormState) => (showErrors ? errors[key] : undefined);

  async function save() {
    if (!input) return;
    const ok = await run(
      () => saveFood(actor, id, input, isNew ? 'create' : 'update', food?.version),
      isNew ? 'Food added. It can now be used in menus.' : 'Saved. Everyone sees the new values now.',
    );
    setConfirming(false);
    if (ok && isNew) onCreated(id);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setShowErrors(true);
    if (!input || duplicate || !id) return;
    if (affectsNutrition) setConfirming(true);
    else void save();
  }

  const select = 'mt-2 block min-h-11 w-full border-0 border-b border-line bg-transparent px-0 text-lg outline-none focus:border-ink';

  return (
    <>
      <button type="button" onClick={onClose} className="min-h-11 text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
        ← All foods
      </button>
      <PageHeader eyebrow={isNew ? 'Admin · New food' : `Admin · Food · v${food.version}`} title={form.name.trim() || 'New food'} />

      {changedElsewhere ? (
        <div className="mt-6">
          <Notice title="Another admin changed this food">
            Saving will fail to protect their edit. <button type="button" className="text-ink underline underline-offset-4" onClick={() => setForm(formFromFood(live))}>Load their version</button>
          </Notice>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-10">
        <Fieldset legend="Food">
          <TextField label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} error={err('name') ?? (duplicate ? `“${duplicate.name}” already exists.` : undefined)} hint={isNew && id ? `id: ${id}` : undefined} />
          <label className="block">
            <span className="label">Category</span>
            <select className={select} value={form.category} onChange={(e) => set('category', e.target.value as FoodFormState['category'])}>
              {FOOD_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </Fieldset>

        <Fieldset legend="Serving and tracking">
          <TextField label="Standard serving" inputMode="decimal" value={form.servingSize} onChange={(e) => set('servingSize', e.target.value)} error={err('servingSize')} />
          <label className="block">
            <span className="label">Unit</span>
            <select className={select} value={form.servingUnit} onChange={(e) => set('servingUnit', e.target.value as FoodFormState['servingUnit'])}>
              {SERVING_UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
          <TextField label="+/− step" inputMode="decimal" value={form.quantityStep} onChange={(e) => set('quantityStep', e.target.value)} error={err('quantityStep')} hint={`Each tap adds ${form.quantityStep || '?'} ${form.servingUnit}`} />
          <label className="flex min-h-11 items-center gap-3 self-end">
            <input type="checkbox" checked={form.trackable} onChange={(e) => set('trackable', e.target.checked)} className="size-5 accent-black" />
            <span>Students can log this food</span>
          </label>
        </Fieldset>

        <Fieldset legend={`Nutrition per ${form.basisQuantity || '?'} ${form.servingUnit}`}>
          <TextField label={`Basis (${form.servingUnit})`} inputMode="decimal" value={form.basisQuantity} onChange={(e) => set('basisQuantity', e.target.value)} error={err('basisQuantity')} hint="The amount these values describe" />
          <TextField label="Calories (kcal)" inputMode="decimal" value={form.kcal} onChange={(e) => set('kcal', e.target.value)} error={err('kcal')} />
          <TextField label="Protein (g)" inputMode="decimal" value={form.protein} onChange={(e) => set('protein', e.target.value)} error={err('protein')} />
          <TextField label="Carbohydrates (g)" inputMode="decimal" value={form.carbs} onChange={(e) => set('carbs', e.target.value)} error={err('carbs')} />
          <TextField label="Fat (g)" inputMode="decimal" value={form.fat} onChange={(e) => set('fat', e.target.value)} error={err('fat')} />
          <TextField label="Fiber (g)" inputMode="decimal" value={form.fiber} onChange={(e) => set('fiber', e.target.value)} error={err('fiber')} hint="Leave blank if unknown" />
          <TextField label="Sugar (g)" inputMode="decimal" value={form.sugar} onChange={(e) => set('sugar', e.target.value)} error={err('sugar')} hint="Leave blank if unknown" />
        </Fieldset>

        <Fieldset legend="Source">
          <label className="block">
            <span className="label">Verification</span>
            <select className={select} value={form.verificationStatus} onChange={(e) => set('verificationStatus', e.target.value as VerificationStatus)}>
              {VERIFICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <TextField label="Varieties (comma separated)" value={form.varieties} onChange={(e) => set('varieties', e.target.value)} error={err('varieties')} hint="e.g. Mango, Lemon — for rotating items" />
          <label className="block sm:col-span-2">
            <span className="label">Data source</span>
            <textarea value={form.dataSource} onChange={(e) => set('dataSource', e.target.value)} rows={3} maxLength={1000} className="mt-2 block w-full border border-line p-2 outline-none focus:border-ink" />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Note</span>
            <textarea value={form.note} onChange={(e) => set('note', e.target.value)} rows={2} maxLength={500} className="mt-2 block w-full border border-line p-2 outline-none focus:border-ink" />
          </label>
        </Fieldset>

        <div className="sticky bottom-16 z-10 space-y-3 border-t border-ink bg-paper py-4 lg:bottom-0">
          {confirming ? (
            <div role="alertdialog" aria-label="Confirm nutrition change" className="border-l-2 border-ink pl-4">
              <p>
                This changes calories or macros for <strong>everyone, from now on</strong>. Meals already logged keep their old values, so past totals don’t
                change.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button busy={status.kind === 'saving'} onClick={() => void save()} autoFocus>
                  Save for everyone
                </Button>
                <Button variant="secondary" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" busy={status.kind === 'saving'}>
                {isNew ? 'Add food' : 'Save changes'}
              </Button>
              <SaveStatusLine status={status} />
            </div>
          )}
          {showErrors && !input ? <p className="text-sm text-danger">Fix the highlighted fields.</p> : null}
        </div>
      </form>

      {!isNew ? (
        <>
          <History foodId={food.id} version={food.version} />
          <section className="mt-12 border-t border-ink pt-4">
            <h2 className="label text-ink">Delete</h2>
            {usage.length ? (
              <p className="mt-3 text-muted">
                Can’t delete — used in {usage.length} place{usage.length === 1 ? '' : 's'}: {usage.slice(0, 6).join('; ')}
                {usage.length > 6 ? '…' : ''}. Replace it in those menus first.
              </p>
            ) : (
              <div className="mt-3">
                <ConfirmAction
                  danger
                  confirmLabel="Delete food"
                  message={<p>Delete “{food.name}”? It disappears from the food list. Past logs keep their name and values.</p>}
                  onConfirm={async () => {
                    const ok = await run(() => deleteFood(actor, food.id, food), 'Deleted.');
                    if (ok) onClose();
                  }}
                >
                  Delete food
                </ConfirmAction>
              </div>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}

function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-ink pt-4">
      <legend className="label float-left w-full text-ink">{legend}</legend>
      <div className="clear-both grid gap-6 pt-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** Previous versions of this food (archived on every edit). */
function History({ foodId, version }: { foodId: string; version: number }) {
  const [entries, setEntries] = useState<(FoodHistoryEntry & { id: string })[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    getDocs(query(collection(db, 'foods', foodId, 'history'), orderBy('archivedAt', 'desc')))
      .then((snap) => !cancelled && setEntries(snap.docs.map((d) => ({ id: d.id, ...(d.data() as FoodHistoryEntry) }))))
      .catch(() => !cancelled && setEntries([]));
    return () => {
      cancelled = true;
    };
  }, [foodId, version]);

  if (!entries?.length) return null;
  return (
    <section className="mt-12 border-t border-ink pt-4">
      <h2 className="label text-ink">Previous versions</h2>
      <ul className="divide-y divide-line">
        {entries.map((h) => (
          <li key={h.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
            <span>
              <span className="font-semibold">v{h.id}</span> · {h.name} · {h.nutrition.calories_kcal} kcal / {h.nutrition.basis.quantity} {h.nutrition.basis.unit} · P{' '}
              {h.nutrition.protein_g} · C {h.nutrition.carbohydrates_g} · F {h.nutrition.fat_g}
            </span>
            <span className="text-muted">{h.archivedAt?.toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
