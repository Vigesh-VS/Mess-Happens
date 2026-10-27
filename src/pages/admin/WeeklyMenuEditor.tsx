import { useState } from 'react';
import { MEALS, PARITIES, WEEKDAYS, menuDocId, type Meal, type MealMenu, type Parity, type Weekday } from '../../models';
import { useMessData } from '../../data/MessDataContext';
import { publishDayMenu } from '../../data/adminWrites';
import { capitalize, parityOf, weekdayOf } from '../../lib/messDate';
import { useMessToday } from '../../hooks/useMessToday';
import { stableStringify } from '../../lib/stableStringify';
import { DayMenuView } from '../../components/menu/DayMenuView';
import { Button } from '../../components/ui/Button';
import { ConfirmAction } from '../../components/ui/ConfirmAction';
import { Notice } from '../../components/ui/Notice';
import { Segmented } from '../../components/ui/Segmented';
import { MealEditor } from './MealEditor';
import { SaveStatusLine } from './SaveStatusLine';
import { useActor, useSave } from './useAdmin';

type Meals = Partial<Record<Meal, MealMenu>>;

interface Draft {
  id: string;
  /** The published version this draft started from (detects someone else publishing). */
  baseJson: string;
  meals: Meals;
}

/** Edit the recurring odd/even weekly template, one day at a time: draft → preview → publish. */
export function WeeklyMenuEditor() {
  const data = useMessData();
  const actor = useActor();
  const { status, run, reset } = useSave();
  const today = useMessToday(data.timezone);
  const [parity, setParity] = useState<Parity>(() => (data.calendar ? parityOf(today, data.calendar) : 'odd'));
  const [weekday, setWeekday] = useState<Weekday>(() => weekdayOf(today));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState(false);

  const id = menuDocId(parity, weekday);
  const published: Meals = data.menus[id]?.meals ?? {};
  const publishedJson = stableStringify(published);
  const active = draft?.id === id ? draft : null;
  const meals = active?.meals ?? published;
  const dirty = active !== null && stableStringify(active.meals) !== publishedJson;
  const conflict = dirty && active.baseJson !== publishedJson;

  function select(nextParity: Parity, nextWeekday: Weekday) {
    if (dirty && !window.confirm('Discard unpublished changes to this day?')) return;
    setDraft(null);
    setPreview(false);
    reset();
    setParity(nextParity);
    setWeekday(nextWeekday);
  }

  function setMeal(meal: Meal, value: MealMenu | null) {
    const next: Meals = { ...meals };
    if (value === null) delete next[meal];
    else next[meal] = value;
    setDraft({ id, baseJson: active?.baseJson ?? publishedJson, meals: next });
    reset();
  }

  return (
    <div>
      <div className="space-y-3">
        <Segmented label="Week" value={parity} onChange={(p) => select(p, weekday)} options={PARITIES.map((p) => ({ value: p, label: `${capitalize(p)} week` }))} />
        <Segmented label="Day" size="sm" value={weekday} onChange={(d) => select(parity, d)} options={WEEKDAYS.map((d) => ({ value: d, label: capitalize(d).slice(0, 3) }))} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
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
        <span className="text-sm text-muted">{dirty ? 'Unpublished changes' : 'Matches what students see'}</span>
      </div>

      {conflict ? (
        <div className="mt-6">
          <Notice title="Someone else published this day while you were editing">
            Publishing will replace their version with yours. Discard to see theirs.
          </Notice>
        </div>
      ) : null}

      {preview ? (
        <DayMenuView meals={MEALS.map((meal) => ({ meal, menu: meals[meal] ?? null, source: 'template' }))} />
      ) : (
        <div className="mt-8 space-y-10">
          {MEALS.map((meal) => (
            <MealEditor
              key={`${id}-${meal}`}
              meal={meal}
              value={meals[meal] ?? null}
              onChange={(v) => setMeal(meal, v)}
              foods={data.foods}
              specialIds={Object.keys(data.specials)}
            />
          ))}
        </div>
      )}

      <div className="sticky bottom-16 z-10 mt-10 flex flex-wrap items-center gap-3 border-t border-ink bg-paper py-4 lg:bottom-0">
        <ConfirmAction
          variant="primary"
          disabled={!dirty}
          confirmLabel="Publish"
          message={
            <p>
              Publish the {parity}-week {capitalize(weekday)} menu? Every student sees it immediately, on every {capitalize(weekday)} of an {parity}{' '}
              week. Logs already recorded are not changed.
            </p>
          }
          onConfirm={async () => {
            const ok = await run(() => publishDayMenu(actor, parity, weekday, meals, published), 'Published. Students see the new menu now.');
            if (ok) setDraft(null);
          }}
        >
          Publish changes
        </ConfirmAction>
        <Button variant="secondary" disabled={!dirty} onClick={() => setDraft(null)}>
          Discard
        </Button>
        <SaveStatusLine status={status} />
      </div>
    </div>
  );
}
