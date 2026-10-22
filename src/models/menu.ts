import type { TimestampLike } from './common';

export const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'] as const;
export type Meal = (typeof MEALS)[number];

export const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const PARITIES = ['odd', 'even'] as const;
export type Parity = (typeof PARITIES)[number];

export interface MenuItem {
  foodId: string;
  /** Items sharing a choiceGroup are "pick one" alternatives. */
  choiceGroup?: string;
  /** Marked *** in the PDF — limited quantity. Display only. */
  limited?: boolean;
  /** How many the mess serves in this slot (display hint; the tracker still starts at 0). */
  servingQuantity?: number;
}

export interface RegularMeal {
  items: MenuItem[];
}

export type SpecialCombination = 'A' | 'B';

export interface SpecialMeal {
  /** Id in `specialMenus`. */
  special: string;
  /** Set only by a date override when the admin pins a combination. */
  combination?: SpecialCombination;
}

export type MealMenu = RegularMeal | SpecialMeal;

export function isSpecialMeal(meal: MealMenu): meal is SpecialMeal {
  return 'special' in meal;
}

/** `menus/{parity}_{weekday}` — recurring weekly template. Array order is display order. */
export interface DayMenu {
  parity: Parity;
  weekday: Weekday;
  meals: Partial<Record<Meal, MealMenu>>;
  updatedAt: TimestampLike;
  updatedBy: string;
}

export function menuDocId(parity: Parity, weekday: Weekday): string {
  return `${parity}_${weekday}`;
}

/** `specialMenus/{id}` */
export interface SpecialMenu {
  description: string;
  variants: Record<'veg' | 'nonVeg', { combinations: Record<SpecialCombination, MenuItem[]> }>;
  alwaysServed: MenuItem[];
  rotationRule: string;
  updatedAt: TimestampLike;
  updatedBy: string;
}

/**
 * `menuOverrides/{yyyy-mm-dd}` — replaces only the listed meals on that date;
 * the weekly template is never modified.
 */
export interface MenuOverride {
  reason: string;
  meals: Partial<Record<Meal, MealMenu>>;
  /** foodId → the variety served that day, e.g. { pickle: 'Mango' }. Display only. */
  varieties?: Record<string, string>;
  updatedAt: TimestampLike;
  updatedBy: string;
}
