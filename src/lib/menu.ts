import {
  MEALS,
  isSpecialMeal,
  menuDocId,
  type AcademicCalendar,
  type DateId,
  type DayMenu,
  type Meal,
  type MealMenu,
  type MenuItem,
  type MenuOverride,
  type Parity,
  type SpecialCombination,
  type SpecialMenu,
  type Weekday,
} from '../models';
import { parityOf, weekdayOf } from './messDate';

export interface ResolvedMeal {
  meal: Meal;
  /** null = nothing scheduled (or the calendar isn't configured and no override exists). */
  menu: MealMenu | null;
  source: 'template' | 'override';
}

export interface ResolvedDay {
  dateId: DateId;
  weekday: Weekday;
  /** null when the academic calendar is not configured. */
  parity: Parity | null;
  meals: ResolvedMeal[];
  override: MenuOverride | null;
  varieties: Record<string, string>;
}

/**
 * The menu for one date: the odd/even weekly template, with any date override replacing only
 * the meals it lists. Never modifies the template.
 */
export function resolveDay(
  dateId: DateId,
  calendar: Pick<AcademicCalendar, 'referenceDate' | 'referenceParity' | 'weekStartsOn'> | null,
  menus: Record<string, DayMenu>,
  overrides: Record<DateId, MenuOverride>,
): ResolvedDay {
  const weekday = weekdayOf(dateId);
  const parity = calendar ? parityOf(dateId, calendar) : null;
  const template = parity ? menus[menuDocId(parity, weekday)] : undefined;
  const override = overrides[dateId] ?? null;

  const meals = MEALS.map((meal): ResolvedMeal => {
    const fromOverride = override?.meals[meal];
    if (fromOverride) return { meal, menu: fromOverride, source: 'override' };
    return { meal, menu: template?.meals[meal] ?? null, source: 'template' };
  });

  return { dateId, weekday, parity, meals, override, varieties: override?.varieties ?? {} };
}

export type MenuBlock =
  | { kind: 'item'; item: MenuItem }
  | { kind: 'choice'; groupId: string; items: MenuItem[] };

/** Groups "pick one" items together, at the position of the group's first item. */
export function toBlocks(items: MenuItem[]): MenuBlock[] {
  const blocks: MenuBlock[] = [];
  const groups = new Map<string, { kind: 'choice'; groupId: string; items: MenuItem[] }>();
  for (const item of items) {
    if (!item.choiceGroup) {
      blocks.push({ kind: 'item', item });
      continue;
    }
    let group = groups.get(item.choiceGroup);
    if (!group) {
      group = { kind: 'choice', groupId: item.choiceGroup, items: [] };
      groups.set(item.choiceGroup, group);
      blocks.push(group);
    }
    group.items.push(item);
  }
  // A "group" of one is just an item.
  return blocks.map((b) => (b.kind === 'choice' && b.items.length === 1 ? { kind: 'item', item: b.items[0]! } : b));
}

export interface SpecialCombinationView {
  id: SpecialCombination;
  /** Served to everyone in this combination (e.g. naan, veg biryani). */
  shared: MenuItem[];
  /** The veg / non-veg alternatives — pick one. */
  veg: MenuItem[];
  nonVeg: MenuItem[];
}

export interface SpecialView {
  alwaysServed: MenuItem[];
  combinations: SpecialCombinationView[];
  /** Set when an admin pinned the combination for this date. */
  pinned: SpecialCombination | null;
}

export function expandSpecial(special: SpecialMenu, pinned?: SpecialCombination): SpecialView {
  const ids: SpecialCombination[] = pinned ? [pinned] : ['A', 'B'];
  const combinations = ids.map((id): SpecialCombinationView => {
    const veg = special.variants.veg.combinations[id] ?? [];
    const nonVeg = special.variants.nonVeg.combinations[id] ?? [];
    const nonVegIds = new Set(nonVeg.map((i) => i.foodId));
    const vegIds = new Set(veg.map((i) => i.foodId));
    return {
      id,
      shared: veg.filter((i) => nonVegIds.has(i.foodId)),
      veg: veg.filter((i) => !nonVegIds.has(i.foodId)),
      nonVeg: nonVeg.filter((i) => !vegIds.has(i.foodId)),
    };
  });
  return { alwaysServed: special.alwaysServed, combinations, pinned: pinned ?? null };
}

/** Every foodId a meal can serve (for "is this logged item still on the menu?"). */
export function foodIdsOf(menu: MealMenu | null, specials: Record<string, SpecialMenu>): Set<string> {
  const ids = new Set<string>();
  if (!menu) return ids;
  if (!isSpecialMeal(menu)) {
    menu.items.forEach((i) => ids.add(i.foodId));
    return ids;
  }
  const special = specials[menu.special];
  if (!special) return ids;
  const view = expandSpecial(special, menu.combination);
  view.alwaysServed.forEach((i) => ids.add(i.foodId));
  for (const c of view.combinations) [...c.shared, ...c.veg, ...c.nonVeg].forEach((i) => ids.add(i.foodId));
  return ids;
}

/** Where a food is used — admins can't delete foods that menus still reference. */
export function foodUsage(
  foodId: string,
  menus: Record<string, DayMenu>,
  overrides: Record<DateId, MenuOverride>,
  specials: Record<string, SpecialMenu>,
): string[] {
  const uses: string[] = [];
  for (const [id, m] of Object.entries(menus)) {
    for (const meal of MEALS) {
      const mm = m.meals[meal];
      if (mm && !isSpecialMeal(mm) && mm.items.some((i) => i.foodId === foodId)) uses.push(`${id.replace('_', ' ')} ${meal}`);
    }
  }
  for (const [date, o] of Object.entries(overrides)) {
    for (const meal of MEALS) {
      const mm = o.meals[meal];
      if (mm && !isSpecialMeal(mm) && mm.items.some((i) => i.foodId === foodId)) uses.push(`override ${date} ${meal}`);
    }
  }
  for (const [id, s] of Object.entries(specials)) {
    if (foodIdsOf({ special: id }, { [id]: s }).has(foodId)) uses.push(`special menu ${id}`);
  }
  return uses;
}
