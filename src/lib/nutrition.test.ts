import { describe, expect, it } from 'vitest';
import type { CatalogFood, ConsumptionEntry } from '../models';
import { applySet, applyStep, countOf, fiberIncomplete, formatQuantity, perServing, scale, snapshotOf, stepOf, totalsOf } from './nutrition';

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

describe('applyStep (+/− counts servings or items)', () => {
  it('first + adds one standard serving for weighed foods (rice: 150 g)', () => {
    const r = applyStep({}, 'lunch', rice, 1);
    expect(r).toEqual({
      kind: 'set', key: 'lunch__rice',
      entry: { meal: 'lunch', foodId: 'rice', name: 'Plain Rice', quantity: 150, unit: 'g', snapshot: snapshotOf(rice) },
    });
  });

  it('+ and − move one serving at a time; never below zero; zero deletes', () => {
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
    expect(entries['lunch__rice']!.quantity).toBe(450);
    expect(countOf(rice, entries['lunch__rice']!.quantity)).toBe(3);
    apply(-1);
    expect(entries['lunch__rice']!.quantity).toBe(300);
    apply(-1);
    expect(apply(-1)).toEqual({ kind: 'delete', key: 'lunch__rice' });
    expect(entries).toEqual({});
    expect(apply(-1)).toEqual({ kind: 'noop' });
  });

  it('countable foods go one item at a time, even when the listed serving is more (bread: 2 slices)', () => {
    const bread: CatalogFood = {
      ...rice, id: 'bread-butter-jam', name: 'Bread, Butter & Jam', servingSize: 2, servingUnit: 'slice',
      nutrition: { ...rice.nutrition, basis: { quantity: 2, unit: 'slice' }, calories_kcal: 210 },
    };
    expect(stepOf(bread)).toBe(1);
    expect(stepOf(vada)).toBe(1);
    const one = applyStep({}, 'breakfast', bread, 1);
    if (one.kind !== 'set') throw new Error();
    expect(one.entry.quantity).toBe(1);
    expect(scale(one.entry.snapshot, 1).kcal).toBe(105);
    const two = applyStep({ [one.key]: one.entry }, 'breakfast', bread, 1);
    expect(two.kind === 'set' && two.entry.quantity).toBe(2);
  });

  it('after typing a custom amount, + adds another serving on top', () => {
    const typed = applySet({}, 'lunch', rice, 175);
    if (typed?.kind !== 'set') throw new Error();
    const r = applyStep({ [typed.key]: typed.entry }, 'lunch', rice, 1);
    expect(r.kind === 'set' && r.entry.quantity).toBe(325);
    expect(countOf(rice, 175)).toBeCloseTo(1.17, 2);
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
    expect(second.entry.quantity).toBe(300);
    expect(second.entry.snapshot.kcal).toBe(130);
    expect(second.entry.snapshot.foodVersion).toBe(3);
  });
});

describe('applySet (typing an exact amount)', () => {
  it('creates an entry with exactly the typed amount, and its nutrition scales', () => {
    const r = applySet({}, 'lunch', rice, 175);
    if (r?.kind !== 'set') throw new Error();
    expect(r.entry.quantity).toBe(175);
    expect(scale(r.entry.snapshot, r.entry.quantity).kcal).toBeCloseTo(227.5);
    expect(scale(r.entry.snapshot, r.entry.quantity).protein_g).toBeCloseTo(4.725);
  });

  it('0 removes the entry; negative or non-numbers are rejected; huge values are capped', () => {
    const first = applySet({}, 'lunch', rice, 100);
    if (first?.kind !== 'set') throw new Error();
    const entries = { [first.key]: first.entry };
    expect(applySet(entries, 'lunch', rice, 0)).toEqual({ kind: 'delete', key: 'lunch__rice' });
    expect(applySet(entries, 'lunch', rice, -5)).toBeNull();
    expect(applySet(entries, 'lunch', rice, Number.NaN)).toBeNull();
    const capped = applySet(entries, 'lunch', rice, 99999);
    expect(capped?.kind === 'set' && capped.entry.quantity).toBe(3000);
    expect(applySet(entries, 'lunch', rice, 100)).toEqual({ kind: 'noop' });
  });

  it('keeps the original snapshot when changing an existing entry', () => {
    const first = applySet({}, 'lunch', rice, 100);
    if (first?.kind !== 'set') throw new Error();
    const edited: CatalogFood = { ...rice, version: 9, nutrition: { ...rice.nutrition, calories_kcal: 500 } };
    const r = applySet({ [first.key]: first.entry }, 'lunch', edited, 250);
    expect(r?.kind === 'set' && r.entry.snapshot.kcal).toBe(130);
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
