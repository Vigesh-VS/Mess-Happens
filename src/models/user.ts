import type { TimestampLike } from './common';

export interface NutritionTargets {
  kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number;
}

/** `users/{uid}` — the admin role is a custom claim, never a field here. */
export interface UserProfile {
  displayName: string;
  email: string | null;
  /** null until the user sets their own; the app then shows labelled defaults. */
  targets: NutritionTargets | null;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}
