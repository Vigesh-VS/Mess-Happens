import { describe, expect, it } from 'vitest';
import { buildSeed, stableStringify } from './buildSeed';
import { loadKit } from './kit';
import { isSpecialMeal } from '../../src/models';

describe('buildSeed with the real kit data', () => {
  const { docs, errors } = buildSeed(loadKit());

  it('has no reference errors', () => {
    expect(errors).toEqual([]);
  });

  it('produces all 162 foods, labelled as estimates', () => {
    expect(Object.keys(docs.foods)).toHaveLength(162);
    for (const food of Object.values(docs.foods)) {
      expect(food.verificationStatus).toBe('estimated');
      expect(food.nameLower).toBe(food.name.toLowerCase());
    }
  });

  it('produces exactly 14 weekly menu docs with ids matching their fields', () => {
    expect(Object.keys(docs.menus)).toHaveLength(14);
    for (const [id, menu] of Object.entries(docs.menus)) {
      expect(id).toBe(`${menu.parity}_${menu.weekday}`);
    }
  });

  it('keeps PDF order, drops the kit `order` field and undefined values', () => {
    const breakfast = docs.menus['even_sunday']!.meals.breakfast;
    if (!breakfast || isSpecialMeal(breakfast)) throw new Error('expected a regular breakfast');
    const items = breakfast.items;
    expect(items[0]).toEqual({ foodId: 'onion-carrot-uttapam' });
    expect(items.every((i) => !('order' in i))).toBe(true);
    expect(items.find((i) => i.foodId === 'seasonal-cut-fruits')).toEqual({
      foodId: 'seasonal-cut-fruits', choiceGroup: 'breakfast-fruit-or-egg', limited: true,
    });
  });

  it('marks even Wednesday dinner as the special dinner', () => {
    expect(docs.menus['even_wednesday']!.meals.dinner).toEqual({ special: 'special-dinner' });
    expect(docs.specialMenus['special-dinner']!.rotationRule).not.toContain('\uFFFD');
  });

  it('attaches rotating varieties to their foods', () => {
    expect(docs.foods['pickle']!.varieties).toContain('Mango');
    expect(docs.foods['rice']!.varieties).toBeUndefined();
  });
});

describe('buildSeed validation', () => {
  it('reports menu items that point at unknown foods', () => {
    const kit = loadKit();
    const day = kit.menuTemplate.weeks['odd']!['monday']!;
    (day['lunch'] as { items: { foodId: string }[] }).items.push({ foodId: 'does-not-exist' });
    expect(buildSeed(kit).errors).toContain('odd monday lunch: unknown foodId "does-not-exist"');
  });
});

describe('stableStringify', () => {
  it('ignores key order and undefined', () => {
    expect(stableStringify({ b: 1, a: [{ y: 2, x: undefined }] })).toBe(stableStringify({ a: [{ y: 2 }], b: 1 }));
  });
});
