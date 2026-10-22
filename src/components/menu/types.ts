import type { CatalogFood, DayTotals, Meal } from '../../models';

/** Supplied by screens that log consumption; omitted for read-only menus. */
export interface Tracking {
  quantityOf: (meal: Meal, foodId: string) => number;
  /** Nutrition of what's logged for this food (from its frozen snapshot), or null if nothing. */
  loggedOf: (meal: Meal, foodId: string) => DayTotals | null;
  step: (meal: Meal, food: CatalogFood, direction: 1 | -1) => void;
  /** Exact amount typed by the user, in the food's unit. */
  setQuantity: (meal: Meal, food: CatalogFood, quantity: number) => void;
  /** When set, steppers are disabled and this explains why (e.g. a future date). */
  disabledReason: string | null;
}
