import {
  MEALS,
  entryKey,
  type CatalogFood,
  type ConsumptionEntry,
  type DayTotals,
  type Meal,
  type NutritionSnapshot,
  type NutritionTargets,
  type ServingUnit,
} from '../models';

export const ZERO_TOTALS: DayTotals = { kcal: 0, protein_g: 0, carbohydrates_g: 0, fat_g: 0, fiber_g: 0 };

/** Shown until a user sets their own — labelled as defaults, not advice. */
export const DEFAULT_TARGETS: NutritionTargets = { kcal: 2000, protein_g: 60, carbohydrates_g: 275, fat_g: 65, fiber_g: 30 };

export const NUTRIENTS: { key: keyof DayTotals; label: string; unit: string }[] = [
  { key: 'kcal', label: 'Calories', unit: 'kcal' },
  { key: 'protein_g', label: 'Protein', unit: 'g' },
  { key: 'carbohydrates_g', label: 'Carbohydrates', unit: 'g' },
  { key: 'fat_g', label: 'Fat', unit: 'g' },
  { key: 'fiber_g', label: 'Fiber', unit: 'g' },
];

/** Freezes a food's current nutrition into a log entry. */
export function snapshotOf(food: CatalogFood): NutritionSnapshot {
  const n = food.nutrition;
  return {
    kcal: n.calories_kcal,
    protein_g: n.protein_g,
    carbohydrates_g: n.carbohydrates_g,
    fat_g: n.fat_g,
    fiber_g: n.fiber_g,
    basisQuantity: n.basis.quantity,
    basisUnit: n.basis.unit,
    foodVersion: food.version,
  };
}

/** Nutrition for `quantity` (in the snapshot's unit), scaled from its basis. */
export function scale(snapshot: NutritionSnapshot, quantity: number): DayTotals {
  const f = snapshot.basisQuantity > 0 ? quantity / snapshot.basisQuantity : 0;
  return {
    kcal: snapshot.kcal * f,
    protein_g: snapshot.protein_g * f,
    carbohydrates_g: snapshot.carbohydrates_g * f,
    fat_g: snapshot.fat_g * f,
    fiber_g: (snapshot.fiber_g ?? 0) * f,
  };
}

/** Nutrition of one standard serving of a food (what the menu shows in grey). */
export function perServing(food: CatalogFood): DayTotals {
  return scale(snapshotOf(food), food.servingSize);
}

export function addTotals(a: DayTotals, b: DayTotals): DayTotals {
  return {
    kcal: a.kcal + b.kcal,
    protein_g: a.protein_g + b.protein_g,
    carbohydrates_g: a.carbohydrates_g + b.carbohydrates_g,
    fat_g: a.fat_g + b.fat_g,
    fiber_g: a.fiber_g + b.fiber_g,
  };
}

/** Rounds for storage so totals don't accumulate float noise. */
export function roundTotals(t: DayTotals): DayTotals {
  const r = (v: number) => Math.round(v * 10) / 10;
  return { kcal: r(t.kcal), protein_g: r(t.protein_g), carbohydrates_g: r(t.carbohydrates_g), fat_g: r(t.fat_g), fiber_g: r(t.fiber_g) };
}

/** Totals come only from logged entries and their frozen snapshots — never from current food data. */
export function totalsOf(entries: Record<string, ConsumptionEntry>): { day: DayTotals; byMeal: Record<Meal, DayTotals> } {
  const byMeal = Object.fromEntries(MEALS.map((m) => [m, ZERO_TOTALS])) as Record<Meal, DayTotals>;
  let day = ZERO_TOTALS;
  for (const e of Object.values(entries)) {
    if (!(e.quantity > 0)) continue;
    const t = scale(e.snapshot, e.quantity);
    byMeal[e.meal] = addTotals(byMeal[e.meal], t);
    day = addTotals(day, t);
  }
  return { day: roundTotals(day), byMeal: Object.fromEntries(MEALS.map((m) => [m, roundTotals(byMeal[m])])) as Record<Meal, DayTotals> };
}

/** True if any logged entry had no fiber data (so the fiber total is a lower bound). */
export function fiberIncomplete(entries: Record<string, ConsumptionEntry>): boolean {
  return Object.values(entries).some((e) => e.quantity > 0 && e.snapshot.fiber_g === null);
}

export type StepResult =
  | { kind: 'set'; key: string; entry: ConsumptionEntry }
  | { kind: 'delete'; key: string }
  | { kind: 'noop' };

/**
 * One +/− tap. Quantities never go below zero; zero removes the entry.
 * A new entry freezes the food's current nutrition; an existing one keeps its snapshot.
 */
export function applyStep(
  entries: Record<string, ConsumptionEntry>,
  meal: Meal,
  food: CatalogFood,
  direction: 1 | -1,
): StepResult {
  const key = entryKey(meal, food.id);
  const existing = entries[key];
  const step = existing && existing.unit !== food.servingUnit ? 1 : food.quantityStep;
  const current = existing?.quantity ?? 0;
  const next = Math.max(0, roundQty(current + direction * step));
  if (next === current) return { kind: 'noop' };
  if (next === 0) return { kind: 'delete', key };
  if (existing) return { kind: 'set', key, entry: { ...existing, quantity: next } };
  return {
    kind: 'set',
    key,
    entry: { meal, foodId: food.id, name: food.name, quantity: next, unit: food.servingUnit, snapshot: snapshotOf(food) },
  };
}

function roundQty(q: number): number {
  return Math.round(q * 1000) / 1000;
}

const PLURAL: Partial<Record<ServingUnit, string>> = { piece: 'pieces', slice: 'slices', cup: 'cups', sachet: 'sachets', bowl: 'bowls' };

export function formatQuantity(quantity: number, unit: ServingUnit): string {
  const q = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(1).replace(/\.0$/, '');
  return `${q} ${quantity === 1 ? unit : (PLURAL[unit] ?? unit)}`;
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
