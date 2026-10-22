import { describe, expect, it } from 'vitest';
import type { CatalogFood, ConsumptionEntry } from '../models';
import { applyStep, fiberIncomplete, formatQuantity, perServing, scale, snapshotOf, totalsOf } from './nutrition';

const rice: CatalogFood = {
  id: 'rice', name: 'Plain Rice', category: 'rice', servingSize: 150, servingUnit: 'g', quantityStep: 50, trackable: true,
  nutrition: { basis: { quantity: 100, unit: 'g' }, calories_kcal: 130, protein_g: 2.7, carbohydrates_g: 28, fat_g: 0.3, fiber_g: 0.4, sugar_g: null },
  verificationStatus: 'estimated', dataSource: 'est', version: 3,
};

const vada: CatalogFood = {
  id: 'medu-vada', name: 'Medu Vada', category: 'breakfast', servingSize: 1, servingUnit: 'piece', quantityStep: 1, trackable: true,
  nutrition: { basis: { quantity: 1, unit: 'piece' }, calories_kcal: 97, protein_g: 3, carbohydrates_g: 9, fat_g: 5.5, fiber_g: null, sugar_g: null },
  verificationStatus: 'estimated', dataSource: 'est', version: 1,
};

describe('portion maths', () => {
  it('scales nutrition from its basis to the quantity eaten', () => {
    expect(scale(snapshotOf(rice), 250).kcal).toBeCloseTo(325);
    expect(scale(snapshotOf(rice), 250).protein_g).toBeCloseTo(6.75);
    expect(scale(snapshotOf(vada), 3).kcal).toBe(291);
  });

  it('per-serving uses the food’s serving size', () => {
    expect(perServing(rice).kcal).toBeCloseTo(195);
  });

  it('missing fiber counts as zero and is flagged', () => {
    expect(scale(snapshotOf(vada), 2).fiber_g).toBe(0);
    const entries: Record<string, ConsumptionEntry> = {
      'breakfast__medu-vada': { meal: 'breakfast', foodId: 'medu-vada', name: 'Medu Vada', quantity: 2, unit: 'piece', snapshot: snapshotOf(vada) },
    };
    expect(fiberIncomplete(entries)).toBe(true);
  });
});

describe('applyStep (+/− tracking)', () => {
  it('first + creates an entry with one step and a frozen snapshot', () => {
    const r = applyStep({}, 'lunch', rice, 1);
    expect(r).toEqual({
      kind: 'set', key: 'lunch__rice',
      entry: { meal: 'lunch', foodId: 'rice', name: 'Plain Rice', quantity: 50, unit: 'g', snapshot: snapshotOf(rice) },
    });
  });

  it('+ and − move by the food’s step; never below zero; zero deletes', () => {
    let entries: Record<string, ConsumptionEntry> = {};
    const apply = (dir: 1 | -1) => {
      const r = applyStep(entries, 'lunch', rice, dir);
      if (r.kind === 'set') entries = { ...entries, [r.key]: r.entry };
      if (r.kind === 'delete') {
        const { [r.key]: _, ...rest } = entries;
        entries = rest;
      }
      return r;
    };
    apply(1); apply(1); apply(1);
    expect(entries['lunch__rice']!.quantity).toBe(150);
    apply(-1);
    expect(entries['lunch__rice']!.quantity).toBe(100);
    apply(-1);
    expect(apply(-1)).toEqual({ kind: 'delete', key: 'lunch__rice' });
    expect(entries).toEqual({});
    expect(apply(-1)).toEqual({ kind: 'noop' });
  });

  it('the same food in two meals is two entries (no duplicates within a meal)', () => {
    const a = applyStep({}, 'lunch', rice, 1);
    const b = applyStep({}, 'dinner', rice, 1);
    expect(a.kind === 'set' && a.key).toBe('lunch__rice');
    expect(b.kind === 'set' && b.key).toBe('dinner__rice');
  });

  it('an existing entry keeps its original snapshot even after the food is edited', () => {
    const first = applyStep({}, 'lunch', rice, 1);
    if (first.kind !== 'set') throw new Error();
    const edited: CatalogFood = { ...rice, version: 4, nutrition: { ...rice.nutrition, calories_kcal: 999 } };
    const second = applyStep({ [first.key]: first.entry }, 'lunch', edited, 1);
    if (second.kind !== 'set') throw new Error();
    expect(second.entry.quantity).toBe(100);
    expect(second.entry.snapshot.kcal).toBe(130);
    expect(second.entry.snapshot.foodVersion).toBe(3);
  });
});

describe('totalsOf (historical totals)', () => {
  it('sums meal and day totals from snapshots only', () => {
    const entries: Record<string, ConsumptionEntry> = {
      'lunch__rice': { meal: 'lunch', foodId: 'rice', name: 'Plain Rice', quantity: 250, unit: 'g', snapshot: snapshotOf(rice) },
      'breakfast__medu-vada': { meal: 'breakfast', foodId: 'medu-vada', name: 'Medu Vada', quantity: 3, unit: 'piece', snapshot: snapshotOf(vada) },
    };
    const { day, byMeal } = totalsOf(entries);
    expect(day.kcal).toBe(616);
    expect(byMeal.lunch.kcal).toBe(325);
    expect(byMeal.breakfast.kcal).toBe(291);
    expect(byMeal.dinner.kcal).toBe(0);
    expect(day.protein_g).toBe(15.8); // 6.75 + 9 → rounded to 0.1
  });

  it('ignores zero or negative quantities', () => {
    const entries: Record<string, ConsumptionEntry> = {
      'lunch__rice': { meal: 'lunch', foodId: 'rice', name: 'Plain Rice', quantity: -50, unit: 'g', snapshot: snapshotOf(rice) },
    };
    expect(totalsOf(entries).day.kcal).toBe(0);
  });
});

describe('formatQuantity', () => {
  it('pluralises countable units only', () => {
    expect(formatQuantity(1, 'piece')).toBe('1 piece');
    expect(formatQuantity(3, 'piece')).toBe('3 pieces');
    expect(formatQuantity(150, 'g')).toBe('150 g');
    expect(formatQuantity(0.5, 'cup')).toBe('0.5 cups');
  });
});
