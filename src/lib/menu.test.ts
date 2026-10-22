import { describe, expect, it } from 'vitest';
import type { DayMenu, MenuOverride, SpecialMenu } from '../models';
import { expandSpecial, foodIdsOf, foodUsage, resolveDay, toBlocks } from './menu';

const ts = { toDate: () => new Date(0), toMillis: () => 0 };
const calendar = { referenceDate: '2026-10-18', referenceParity: 'even', weekStartsOn: 'sunday' } as const;

const menus: Record<string, DayMenu> = {
  even_thursday: {
    parity: 'even', weekday: 'thursday', updatedAt: ts, updatedBy: 'x',
    meals: { breakfast: { items: [{ foodId: 'poha' }] }, lunch: { items: [{ foodId: 'paneer-peas-curry' }] } },
  },
  odd_thursday: {
    parity: 'odd', weekday: 'thursday', updatedAt: ts, updatedBy: 'x',
    meals: { breakfast: { items: [{ foodId: 'wheat-rava-upma' }] }, lunch: { items: [{ foodId: 'kadai-paneer' }] } },
  },
  even_wednesday: {
    parity: 'even', weekday: 'wednesday', updatedAt: ts, updatedBy: 'x',
    meals: { dinner: { special: 'special-dinner' } },
  },
};

const special: SpecialMenu = {
  description: '', rotationRule: '', updatedAt: ts, updatedBy: 'x',
  variants: {
    veg: { combinations: { A: [{ foodId: 'naan' }, { foodId: 'paneer-butter-masala' }, { foodId: 'veg-biryani' }], B: [{ foodId: 'roti' }, { foodId: 'paneer-tikka-masala' }, { foodId: 'veg-pulao' }] } },
    nonVeg: { combinations: { A: [{ foodId: 'naan' }, { foodId: 'butter-chicken' }, { foodId: 'veg-biryani' }], B: [{ foodId: 'roti' }, { foodId: 'kadai-chicken' }, { foodId: 'veg-pulao' }] } },
  },
  alwaysServed: [{ foodId: 'raitha' }, { foodId: 'ice-cream', servingQuantity: 1 }],
};

describe('resolveDay', () => {
  it('picks the template for the date’s weekday and parity', () => {
    const day = resolveDay('2026-10-22', calendar, menus, {});
    expect(day.parity).toBe('even');
    expect(day.weekday).toBe('thursday');
    expect(day.meals.find((m) => m.meal === 'lunch')!.menu).toEqual({ items: [{ foodId: 'paneer-peas-curry' }] });
    const next = resolveDay('2026-10-29', calendar, menus, {});
    expect(next.parity).toBe('odd');
    expect(next.meals.find((m) => m.meal === 'lunch')!.menu).toEqual({ items: [{ foodId: 'kadai-paneer' }] });
  });

  it('an override replaces only the meals it lists, only on its date', () => {
    const overrides: Record<string, MenuOverride> = {
      '2026-10-22': { reason: 'Festival', meals: { lunch: { items: [{ foodId: 'veg-biryani' }] } }, varieties: { pickle: 'Mango' }, updatedAt: ts, updatedBy: 'x' },
    };
    const day = resolveDay('2026-10-22', calendar, menus, overrides);
    const lunch = day.meals.find((m) => m.meal === 'lunch')!;
    expect(lunch).toEqual({ meal: 'lunch', menu: { items: [{ foodId: 'veg-biryani' }] }, source: 'override' });
    expect(day.meals.find((m) => m.meal === 'breakfast')!.source).toBe('template');
    expect(day.varieties).toEqual({ pickle: 'Mango' });
    // Template untouched, other Thursdays unaffected.
    expect(menus['even_thursday']!.meals.lunch).toEqual({ items: [{ foodId: 'paneer-peas-curry' }] });
    expect(resolveDay('2026-11-05', calendar, menus, overrides).meals.find((m) => m.meal === 'lunch')!.source).toBe('template');
  });

  it('without a calendar there is no parity and no template — but overrides still apply', () => {
    const overrides: Record<string, MenuOverride> = {
      '2026-10-22': { reason: 'x', meals: { dinner: { items: [{ foodId: 'naan' }] } }, updatedAt: ts, updatedBy: 'x' },
    };
    const day = resolveDay('2026-10-22', null, menus, overrides);
    expect(day.parity).toBeNull();
    expect(day.meals.find((m) => m.meal === 'lunch')!.menu).toBeNull();
    expect(day.meals.find((m) => m.meal === 'dinner')!.menu).toEqual({ items: [{ foodId: 'naan' }] });
  });

  it('missing meals resolve to null', () => {
    expect(resolveDay('2026-10-22', calendar, menus, {}).meals.find((m) => m.meal === 'snacks')!.menu).toBeNull();
  });
});

describe('toBlocks', () => {
  it('groups pick-one items at the first item’s position', () => {
    const blocks = toBlocks([
      { foodId: 'dosa' },
      { foodId: 'fruit', choiceGroup: 'g' },
      { foodId: 'tea' },
      { foodId: 'egg', choiceGroup: 'g' },
    ]);
    expect(blocks).toEqual([
      { kind: 'item', item: { foodId: 'dosa' } },
      { kind: 'choice', groupId: 'g', items: [{ foodId: 'fruit', choiceGroup: 'g' }, { foodId: 'egg', choiceGroup: 'g' }] },
      { kind: 'item', item: { foodId: 'tea' } },
    ]);
  });

  it('a lone group member is a plain item', () => {
    expect(toBlocks([{ foodId: 'a', choiceGroup: 'g' }])).toEqual([{ kind: 'item', item: { foodId: 'a', choiceGroup: 'g' } }]);
  });
});

describe('special dinner', () => {
  it('shows both combinations by default, split into shared and veg/non-veg', () => {
    const view = expandSpecial(special);
    expect(view.pinned).toBeNull();
    expect(view.combinations.map((c) => c.id)).toEqual(['A', 'B']);
    expect(view.combinations[0]).toEqual({
      id: 'A',
      shared: [{ foodId: 'naan' }, { foodId: 'veg-biryani' }],
      veg: [{ foodId: 'paneer-butter-masala' }],
      nonVeg: [{ foodId: 'butter-chicken' }],
    });
  });

  it('shows only the pinned combination', () => {
    expect(expandSpecial(special, 'B').combinations.map((c) => c.id)).toEqual(['B']);
  });

  it('lists every food a special meal can serve', () => {
    const ids = foodIdsOf({ special: 'special-dinner', combination: 'A' }, { 'special-dinner': special });
    expect([...ids].sort()).toEqual(['butter-chicken', 'ice-cream', 'naan', 'paneer-butter-masala', 'raitha', 'veg-biryani']);
  });
});

describe('foodUsage', () => {
  it('finds templates, overrides and special menus that use a food', () => {
    const overrides: Record<string, MenuOverride> = {
      '2026-11-01': { reason: 'x', meals: { lunch: { items: [{ foodId: 'poha' }] } }, updatedAt: ts, updatedBy: 'x' },
    };
    expect(foodUsage('poha', menus, overrides, {})).toEqual(['even thursday breakfast', 'override 2026-11-01 lunch']);
    expect(foodUsage('naan', menus, {}, { 'special-dinner': special })).toEqual(['special menu special-dinner']);
    expect(foodUsage('unused', menus, overrides, { 'special-dinner': special })).toEqual([]);
  });
});
