import type { TimestampLike } from './common';

export const SERVING_UNITS = ['g', 'ml', 'piece', 'slice', 'cup', 'tsp', 'sachet', 'bowl'] as const;
export type ServingUnit = (typeof SERVING_UNITS)[number];

export const FOOD_CATEGORIES = [
  'breakfast', 'bread', 'rice', 'curry', 'side', 'chutney', 'condiment',
  'snack', 'dessert', 'beverage', 'fruit', 'dairy', 'egg',
] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export const VERIFICATION_STATUSES = ['estimated', 'needs-review', 'verified'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** Nutrition values for `basis.quantity` of `basis.unit`. */
export interface Nutrition {
  basis: { quantity: number; unit: ServingUnit };
  calories_kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
}

/** `foods/{foodId}` */
export interface Food {
  id: string;
  name: string;
  /** Lower-cased name, for duplicate checks and search. */
  nameLower: string;
  category: FoodCategory;
  servingSize: number;
  servingUnit: ServingUnit;
  /** +/− increment in `servingUnit`. */
  quantityStep: number;
  trackable: boolean;
  nutrition: Nutrition;
  verificationStatus: VerificationStatus;
  dataSource: string;
  note?: string;
  /** Rotating varieties served under this one averaged record (display only). */
  varieties?: string[];
  /** Incremented on every edit; the previous values go to `foods/{id}/history/{version}`. */
  version: number;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
  updatedBy: string;
}

/** `foods/{foodId}/history/{version}` — immutable copy of a food before an edit. */
export interface FoodHistoryEntry extends Omit<Food, 'id'> {
  archivedAt: TimestampLike;
  archivedBy: string;
}
