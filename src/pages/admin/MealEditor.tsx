import { useState } from 'react';
import { ArrowDown, ArrowUp, Replace, X } from 'lucide-react';
import { isSpecialMeal, type CatalogFood, type Meal, type MealMenu, type MenuItem, type SpecialCombination } from '../../models';
import { FoodPicker } from './FoodPicker';

interface MealEditorProps {
  meal: Meal;
  value: MealMenu | null;
  onChange: (next: MealMenu | null) => void;
  foods: Record<string, CatalogFood>;
  choiceGroups: Record<string, string>;
  specialIds: string[];
  /** Date overrides may pin special-dinner combination A or B. */
  allowCombination?: boolean;
}

const iconBtn = 'flex size-11 items-center justify-center text-muted transition-colors hover:bg-hover hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent';

/** Edit one meal: add, remove, replace and reorder items; set pick-one / limited / served count. */
export function MealEditor({ meal, value, onChange, foods, choiceGroups, specialIds, allowCombination }: MealEditorProps) {
  const [picking, setPicking] = useState<{ mode: 'add' } | { mode: 'replace'; index: number } | null>(null);

  if (value && isSpecialMeal(value)) {
    return (
      <section className="border-t border-ink pt-4">
        <h3 className="label text-ink">{meal}</h3>
        <p className="mt-3 text-lg font-semibold">Special menu: {value.special}</p>
        {allowCombination ? (
          <label className="mt-3 flex items-center gap-3 text-sm">
            <span className="label">Combination</span>
            <select
              value={value.combination ?? ''}
              onChange={(e) => onChange({ special: value.special, combination: (e.target.value || undefined) as SpecialCombination | undefined })}
              className="min-h-11 border border-ink bg-paper px-2"
            >
              <option value="">Show both A and B</option>
              <option value="A">Combination A</option>
              <option value="B">Combination B</option>
            </select>
          </label>
        ) : (
          <p className="mt-1 text-sm text-muted">Pin combination A or B for a specific date with a date change.</p>
        )}
        <button type="button" className="mt-3 min-h-11 text-sm underline underline-offset-4" onClick={() => onChange({ items: [] })}>
          Replace with a regular menu
        </button>
      </section>
    );
  }

  const items = value?.items ?? [];
  const setItems = (next: MenuItem[]) => onChange({ items: next });
  const update = (i: number, patch: Partial<MenuItem>) =>
    setItems(items.map((item, j) => (j === i ? cleanItem({ ...item, ...patch }) : item)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d]!, next[i]!];
    setItems(next);
  };

  return (
    <section className="border-t border-ink pt-4">
      <div className="flex items-baseline justify-between">
        <h3 className="label text-ink">{meal}</h3>
        <span className="text-sm text-muted">{items.length} items</span>
      </div>

      <ol className="mt-2 divide-y divide-line">
        {items.map((item, i) => {
          const food = foods[item.foodId];
          return (
            <li key={`${item.foodId}-${i}`} className="py-3">
              <div className="flex items-center gap-1">
                <span className="w-6 shrink-0 text-sm text-muted tabular-nums">{i + 1}</span>
                <span className={['min-w-0 flex-1 truncate font-semibold', food ? '' : 'text-danger'].join(' ')}>
                  {food?.name ?? `Unknown: ${item.foodId}`}
                </span>
                <button type="button" className={iconBtn} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${food?.name} up`}>
                  <ArrowUp aria-hidden className="size-4" />
                </button>
                <button type="button" className={iconBtn} onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move ${food?.name} down`}>
                  <ArrowDown aria-hidden className="size-4" />
                </button>
                <button type="button" className={iconBtn} onClick={() => setPicking({ mode: 'replace', index: i })} aria-label={`Replace ${food?.name}`}>
                  <Replace aria-hidden className="size-4" />
                </button>
                <button type="button" className={iconBtn} onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label={`Remove ${food?.name}`}>
                  <X aria-hidden className="size-4" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 pl-7 text-sm">
                <label className="flex items-center gap-2">
                  <span className="text-muted">Pick-one group</span>
                  <select
                    value={item.choiceGroup ?? ''}
                    onChange={(e) => update(i, { choiceGroup: e.target.value || undefined })}
                    className="min-h-9 max-w-44 border border-line bg-paper px-1"
                  >
                    <option value="">None</option>
                    {Object.keys(choiceGroups).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={item.limited ?? false} onChange={(e) => update(i, { limited: e.target.checked || undefined })} className="size-5 accent-black" />
                  <span>Limited</span>
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-muted">Served</span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={item.servingQuantity ?? ''}
                    onChange={(e) => update(i, { servingQuantity: e.target.value ? Math.max(1, Number(e.target.value)) : undefined })}
                    className="min-h-9 w-16 border border-line bg-paper px-1"
                    placeholder="—"
                  />
                </label>
              </div>
              {picking?.mode === 'replace' && picking.index === i ? (
                <div className="mt-3">
                  <FoodPicker
                    foods={foods}
                    label={`Replace ${food?.name ?? item.foodId} with`}
                    onPick={(foodId) => {
                      update(i, { foodId });
                      setPicking(null);
                    }}
                    onCancel={() => setPicking(null)}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {picking?.mode === 'add' ? (
        <FoodPicker
          foods={foods}
          label={`Add to ${meal}`}
          exclude={new Set(items.map((i) => i.foodId))}
          onPick={(foodId) => {
            setItems([...items, { foodId }]);
            setPicking(null);
          }}
          onCancel={() => setPicking(null)}
        />
      ) : (
        <div className="flex flex-wrap gap-x-6">
          <button type="button" onClick={() => setPicking({ mode: 'add' })} className="min-h-11 text-sm font-semibold underline underline-offset-4">
            + Add food
          </button>
          {specialIds.length > 0 ? (
            <button type="button" onClick={() => onChange({ special: specialIds[0]! })} className="min-h-11 text-sm text-muted underline underline-offset-4 hover:text-ink">
              Use special menu instead
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

/** Firestore rejects undefined in arrays; drop empty optional fields. */
function cleanItem(item: MenuItem): MenuItem {
  const out: MenuItem = { foodId: item.foodId };
  if (item.choiceGroup) out.choiceGroup = item.choiceGroup;
  if (item.limited) out.limited = true;
  if (item.servingQuantity) out.servingQuantity = item.servingQuantity;
  return out;
}
