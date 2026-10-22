import type { TimestampLike } from './common';
import type { ServingUnit } from './food';
import type { Meal } from './menu';

/** Nutrition copied in when an entry is first created, so later food edits never change history. */
export interface NutritionSnapshot {
  kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number | null;
  basisQuantity: number;
  basisUnit: ServingUnit;
  foodVersion: number;
}

export interface ConsumptionEntry {
  meal: Meal;
  foodId: string;
  /** Food name when logged, so history still reads well if the food is renamed or deleted. */
  name: string;
  quantity: number;
  unit: ServingUnit;
  snapshot: NutritionSnapshot;
}

export interface DayTotals {
  kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number;
}

/** `users/{uid}/days/{yyyy-mm-dd}` */
export interface DayLog {
  /** Keyed `${meal}__${foodId}` — the key makes duplicate entries impossible. */
  entries: Record<string, ConsumptionEntry>;
  totals: DayTotals;
  updatedAt: TimestampLike;
}

export function entryKey(meal: Meal, foodId: string): string {
  return `${meal}__${foodId}`;
}
