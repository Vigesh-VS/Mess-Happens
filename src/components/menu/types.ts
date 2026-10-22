import type { CatalogFood, Meal } from '../../models';

/** Supplied by screens that log consumption; omitted for read-only menus. */
export interface Tracking {
  quantityOf: (meal: Meal, foodId: string) => number;
  loggedKcalOf: (meal: Meal, foodId: string) => number;
  step: (meal: Meal, food: CatalogFood, direction: 1 | -1) => void;
  /** When set, steppers are disabled and this explains why (e.g. a future date). */
  disabledReason: string | null;
}
