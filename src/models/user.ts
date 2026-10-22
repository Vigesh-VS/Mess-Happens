import type { TimestampLike } from './common';

export interface NutritionTargets {
  kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface BodyDetails {
  heightCm: number;
  age: number;
  sex: 'male' | 'female';
  activity: 'sedentary' | 'light' | 'moderate' | 'active';
  goal: 'lose' | 'maintain' | 'gain';
}

/** `users/{uid}` — the admin role is a custom claim, never a field here. */
export interface UserProfile {
  displayName: string;
  email: string | null;
  /** null until the user sets their own; the app then shows labelled defaults. */
  targets: NutritionTargets | null;
  /** Optional details for the maintenance-calorie calculator. */
  body?: BodyDetails | null;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

/** `users/{uid}/weights/{yyyy-mm-dd}` — one weigh-in per day, private to the user. */
export interface WeightEntry {
  kg: number;
  updatedAt: TimestampLike;
}

export const WEIGHT_RANGE_KG = { min: 20, max: 300 } as const;
