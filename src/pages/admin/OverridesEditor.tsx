import { useMemo, useState } from 'react';
import { MEALS, isDateId, type DateId, type Meal, type MealMenu, type MenuOverride } from '../../models';
import { useMessData } from '../../data/MessDataContext';
import { deleteOverride, saveOverride } from '../../data/adminWrites';
import { useMessToday } from '../../hooks/useMessToday';
import { foodIdsOf, resolveDay } from '../../lib/menu';
import { addDays, capitalize, formatShortDate } from '../../lib/messDate';
import { DayMenuView } from '../../components/menu/DayMenuView';
import { Button } from '../../components/ui/Button';
import { ConfirmAction } from '../../components/ui/ConfirmAction';
import { Notice } from '../../components/ui/Notice';
import { Segmented } from '../../components/ui/Segmented';
import { TextField } from '../../components/ui/TextField';
import { MealEditor } from './MealEditor';
import { SaveStatusLine } from './SaveStatusLine';
import { useActor, useSave } from './useAdmin';

type Editing = { date: DateId; isNew: boolean } | null;

/** Date-specific changes: replace meals for one date only; the weekly template is untouched. */
export function OverridesEditor() {
  const data = useMessData();
  const today = useMessToday(data.timezone);
  const [editing, setEditing] = useState<Editing>(null);

  const entries = Object.entries(data.overrides).sort(([a], [b]) => a.localeCompare(b));
  const upcoming = entries.filter(([d]) => d >= today);
  const past = entries.filter(([d]) => d < today).reverse();

  if (editing) {
    return (
      <OverrideForm
        key={editing.date}
        initialDate={editing.date}
        isNew={editing.isNew}
        existing={editing.isNew ? null : (data.overrides[editing.date] ?? null)}
        onDone={() => setEditing(null)}
      />
    );
  }

  const row = ([date, o]: [string, MenuOverride]) => (
    <li key={date}>
      <button type="button" onClick={() => setEditing({ date, isNew: false })} className="flex min-h-14 w-full items-center justify-between gap-4 text-left hover:bg-hover">
        <span className="font-semibold">{formatShortDate(date)}</span>
        <span className="min-w-0 truncate text-sm text-muted">
          {o.reason} · {MEALS.filter((m) => o.meals[m]).join(', ') || 'varieties only'}
        </span>
      </button>
    </li>
  );

  return (
    <div>
      <Button
        onClick={() => {
          let date = today;
          while (data.overrides[date]) date = addDays(date, 1);
          setEditing({ date, isNew: true });
        }}
      >
        New date change
      </Button>
      <p className="mt-3 max-w-prose text-sm text-muted">
        For festivals, one-off replacements, pinning special-dinner combination A or B, or setting the day’s pickle/fruit variety.
      </p>

      <h3 className="label mt-8">Upcoming</h3>
      {upcoming.length ? <ul className="divide-y divide-line">{upcoming.map(row)}</ul> : <p className="py-3 text-muted">None scheduled.</p>}

      {past.length ? (
        <details className="mt-6">
          <summary className="label min-h-11 cursor-pointer">Past ({past.length})</summary>
          <ul className="divide-y divide-line">{past.map(row)}</ul>
        </details>
      ) : null}
    </div>
  );
}

function OverrideForm({ initialDate, isNew, existing, onDone }: { initialDate: DateId; isNew: boolean; existing: MenuOverride | null; onDone: () => void }) {
  const data = useMessData();
  const actor = useActor();
  const { status, run } = useSave();
  const [date, setDate] = useState(initialDate);
  const [reason, setReason] = useState(existing?.reason ?? '');
  const [meals, setMeals] = useState<Partial<Record<Meal, MealMenu>>>(existing?.meals ?? {});
  const [varieties, setVarieties] = useState<Record<string, string>>(existing?.varieties ?? {});
  const [preview, setPreview] = useState(false);

  const validDate = isDateId(date);
  const taken = isNew && validDate && Boolean(data.overrides[date]);
  // The regular menu for this date, ignoring any existing override.
  const regular = useMemo(() => (validDate ? resolveDay(date, data.calendar, data.menus, {}) : null), [validDate, date, data.calendar, data.menus]);
  const draft = { reason, meals, varieties } as MenuOverride; // only meals/varieties/reason are read
  const resolved = validDate ? resolveDay(date, data.calendar, data.menus, { [date]: draft }) : null;

  // Foods with rotating varieties that are on the menu that day.
  const varietyFoods = useMemo(() => {
    if (!resolved) return [];
    const ids = new Set<string>();
    resolved.meals.forEach((m) => foodIdsOf(m.menu, data.specials).forEach((id) => ids.add(id)));
    return [...ids].map((id) => data.foods[id]).filter((f) => f?.varieties?.length);
  }, [resolved, data.specials, data.foods]);

  const hasChanges = MEALS.some((m) => meals[m]) || Object.values(varieties).some(Boolean);
  const canSave = validDate && !taken && reason.trim().length > 0 && hasChanges;

  function toggleMeal(meal: Meal, on: boolean) {
    const next = { ...meals };
    if (on) next[meal] = structuredClone(regular?.meals.find((m) => m.meal === meal)?.menu ?? { items: [] });
    else delete next[meal];
    setMeals(next);
  }

  return (
    <div>
      <button type="button" onClick={onDone} className="min-h-11 text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
        ← All date changes
      </button>
      <h3 className="text-title mt-2">{isNew ? 'New date change' : `Change on ${formatShortDate(initialDate)}`}</h3>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <TextField
          label="Date"
          type="date"
          value={date}
          disabled={!isNew}
          onChange={(e) => setDate(e.target.value)}
          error={!validDate ? 'Pick a date.' : taken ? 'This date already has a change — edit that one instead.' : undefined}
          hint={regular?.parity ? `${capitalize(regular.weekday)} · ${regular.parity} week` : undefined}
        />
        <TextField label="Reason (shown to students)" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Diwali special lunch" />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Segmented
          label="Mode"
          size="sm"
          value={preview ? 'preview' : 'edit'}
          onChange={(v) => setPreview(v === 'preview')}
          options={[
            { value: 'edit', label: 'Edit' },
            { value: 'preview', label: 'Preview' },
          ]}
        />
      </div>

      {preview && resolved ? (
        <DayMenuView meals={resolved.meals} varieties={resolved.varieties} overrideReason={reason || 'special change'} />
      ) : (
        <div className="mt-8 space-y-8">
          {MEALS.map((meal) => {
            const on = Boolean(meals[meal]);
            return (
              <div key={meal}>
                <label className="flex min-h-11 items-center gap-3">
                  <input type="checkbox" checked={on} onChange={(e) => toggleMeal(meal, e.target.checked)} className="size-5 accent-black" />
                  <span className="font-semibold">Change {meal} on this date</span>
                </label>
                {on ? (
                  <MealEditor
                    meal={meal}
                    value={meals[meal] ?? null}
                    onChange={(v) => setMeals({ ...meals, [meal]: v ?? { items: [] } })}
                    foods={data.foods}
                    choiceGroups={data.menuConfig?.choiceGroups ?? {}}
                    specialIds={Object.keys(data.specials)}
                    allowCombination
                  />
                ) : null}
              </div>
            );
          })}

          {varietyFoods.length ? (
            <section className="border-t border-ink pt-4">
              <h3 className="label text-ink">Varieties served</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {varietyFoods.map((f) => (
                  <label key={f!.id} className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{f!.name}</span>
                    <select
                      value={varieties[f!.id] ?? ''}
                      onChange={(e) => {
                        const next = { ...varieties };
                        if (e.target.value) next[f!.id] = e.target.value;
                        else delete next[f!.id];
                        setVarieties(next);
                      }}
                      className="min-h-11 border border-ink bg-paper px-2"
                    >
                      <option value="">Not set</option>
                      {f!.varieties!.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <div className="sticky bottom-16 z-10 mt-10 flex flex-wrap items-center gap-3 border-t border-ink bg-paper py-4 lg:bottom-0">
        <ConfirmAction
          variant="primary"
          disabled={!canSave}
          confirmLabel="Publish"
          message={<p>Publish this change for {validDate ? formatShortDate(date) : 'this date'}? Students see it immediately. The weekly menu is not changed.</p>}
          onConfirm={async () => {
            const ok = await run(() => saveOverride(actor, date, { reason, meals, varieties }, existing), 'Published.');
            if (ok) onDone();
          }}
        >
          Publish change
        </ConfirmAction>
        {existing ? (
          <ConfirmAction
            danger
            confirmLabel="Delete"
            message={<p>Delete this change? {formatShortDate(initialDate)} goes back to the regular menu.</p>}
            onConfirm={async () => {
              const ok = await run(() => deleteOverride(actor, initialDate, existing), 'Deleted.');
              if (ok) onDone();
            }}
          >
            Delete
          </ConfirmAction>
        ) : null}
        <SaveStatusLine status={status} />
      </div>
      {!hasChanges ? (
        <div className="mt-2">
          <Notice>Turn on at least one meal or set a variety to publish.</Notice>
        </div>
      ) : null}
    </div>
  );
}
