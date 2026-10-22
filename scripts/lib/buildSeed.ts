// Pure transform: kit/data/*.json → the Firestore documents the app reads.
// No Firebase imports here, so it can be unit-tested without an emulator.
import {
  MEALS,
  PARITIES,
  WEEKDAYS,
  menuDocId,
  type DayMenu,
  type Food,
  type MealMenu,
  type MenuConfig,
  type MenuItem,
  type SpecialMenu,
} from '../../src/models';

// ---- kit file shapes ----

export interface KitFood {
  id: string;
  name: string;
  category: Food['category'];
  servingSize: number;
  servingUnit: Food['servingUnit'];
  quantityStep: number;
  trackable: boolean;
  nutrition: Food['nutrition'];
  verificationStatus: Food['verificationStatus'];
  dataSource: string;
  note?: string;
}

interface KitMenuItem extends MenuItem {
  order?: number;
}

type KitMeal = { items: KitMenuItem[] } | { special: string };

export interface KitMenuTemplate {
  mealOrder: MenuConfig['mealOrder'];
  choiceGroups: Record<string, string>;
  weeks: Record<string, Record<string, Record<string, KitMeal>>>;
}

export interface KitSpecialDinner {
  description: string;
  variants: SpecialMenu['variants'];
  alwaysServed: MenuItem[];
  rotationRule: string;
}

export type KitRotations = Record<string, string[] | string>;

export interface KitData {
  foods: { foods: KitFood[] };
  menuTemplate: KitMenuTemplate;
  specialDinner: KitSpecialDinner;
  rotations: KitRotations;
}

// ---- seed document shapes (server fields like timestamps are added by the writer) ----

type Server = 'createdAt' | 'updatedAt' | 'updatedBy' | 'version';

export interface SeedDocs {
  foods: Record<string, Omit<Food, 'id' | Server>>;
  menus: Record<string, Omit<DayMenu, 'updatedAt' | 'updatedBy'>>;
  menuConfig: Omit<MenuConfig, 'updatedAt' | 'updatedBy'>;
  specialMenus: Record<string, Omit<SpecialMenu, 'updatedAt' | 'updatedBy'>>;
}

export const SPECIAL_DINNER_ID = 'special-dinner';

/** Firestore rejects `undefined`; drop absent optional fields instead. */
function cleanItem(item: KitMenuItem): MenuItem {
  const out: MenuItem = { foodId: item.foodId };
  if (item.choiceGroup) out.choiceGroup = item.choiceGroup;
  if (item.limited) out.limited = true;
  if (item.servingQuantity !== undefined) out.servingQuantity = item.servingQuantity;
  return out;
}

export function buildSeed(kit: KitData): { docs: SeedDocs; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Foods
  const foods: SeedDocs['foods'] = {};
  for (const f of kit.foods.foods) {
    if (foods[f.id]) errors.push(`Duplicate food id: ${f.id}`);
    const varieties = kit.rotations[f.id];
    foods[f.id] = {
      name: f.name,
      nameLower: f.name.toLowerCase(),
      category: f.category,
      servingSize: f.servingSize,
      servingUnit: f.servingUnit,
      quantityStep: f.quantityStep,
      trackable: f.trackable,
      nutrition: f.nutrition,
      verificationStatus: f.verificationStatus,
      dataSource: f.dataSource,
      ...(f.note ? { note: f.note } : {}),
      ...(Array.isArray(varieties) ? { varieties } : {}),
    };
  }

  const used = new Set<string>();
  const checkRef = (foodId: string, where: string) => {
    used.add(foodId);
    if (!foods[foodId]) errors.push(`${where}: unknown foodId "${foodId}"`);
  };

  // Weekly menus — exactly 14 docs
  const menus: SeedDocs['menus'] = {};
  for (const parity of PARITIES) {
    for (const weekday of WEEKDAYS) {
      const kitDay = kit.menuTemplate.weeks[parity]?.[weekday];
      if (!kitDay) {
        errors.push(`Missing menu: ${parity} ${weekday}`);
        continue;
      }
      const meals: Partial<Record<(typeof MEALS)[number], MealMenu>> = {};
      for (const meal of MEALS) {
        const kitMeal = kitDay[meal];
        if (!kitMeal) {
          warnings.push(`No ${meal} on ${parity} ${weekday}`);
          continue;
        }
        if ('special' in kitMeal) {
          meals[meal] = { special: kitMeal.special };
          if (kitMeal.special !== SPECIAL_DINNER_ID) errors.push(`${parity} ${weekday} ${meal}: unknown special "${kitMeal.special}"`);
          continue;
        }
        const items = [...kitMeal.items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        for (const item of items) {
          checkRef(item.foodId, `${parity} ${weekday} ${meal}`);
          if (item.choiceGroup && !kit.menuTemplate.choiceGroups[item.choiceGroup]) {
            errors.push(`${parity} ${weekday} ${meal}: unknown choiceGroup "${item.choiceGroup}"`);
          }
        }
        meals[meal] = { items: items.map(cleanItem) };
      }
      menus[menuDocId(parity, weekday)] = { parity, weekday, meals };
    }
  }

  // Special dinner
  const sd = kit.specialDinner;
  for (const [variant, { combinations }] of Object.entries(sd.variants)) {
    for (const [combo, items] of Object.entries(combinations)) {
      items.forEach((i) => checkRef(i.foodId, `special dinner ${variant} ${combo}`));
    }
  }
  sd.alwaysServed.forEach((i) => checkRef(i.foodId, 'special dinner always-served'));

  const specialMenus: SeedDocs['specialMenus'] = {
    [SPECIAL_DINNER_ID]: {
      description: sd.description,
      variants: {
        veg: { combinations: { A: sd.variants.veg.combinations.A.map(cleanItem), B: sd.variants.veg.combinations.B.map(cleanItem) } },
        nonVeg: { combinations: { A: sd.variants.nonVeg.combinations.A.map(cleanItem), B: sd.variants.nonVeg.combinations.B.map(cleanItem) } },
      },
      alwaysServed: sd.alwaysServed.map(cleanItem),
      // The kit generator wrote this file in a non-UTF-8 code page; restore the dash.
      rotationRule: sd.rotationRule.replace(/\uFFFD/g, '\u2014'),
    },
  };

  for (const id of Object.keys(foods)) {
    if (!used.has(id)) warnings.push(`Food "${id}" is not used by any menu`);
  }

  return {
    docs: {
      foods,
      menus,
      menuConfig: { mealOrder: kit.menuTemplate.mealOrder, choiceGroups: kit.menuTemplate.choiceGroups },
      specialMenus,
    },
    errors,
    warnings,
  };
}

/** Key-order-independent JSON, used to decide whether a stored doc differs from the seed. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
