import { describe, expect, it } from 'vitest';
import type { CatalogFood } from '../../models';
import { EMPTY_FORM, formFromFood, nutritionChanged, validateFoodForm } from './foodForm';

const rice: CatalogFood = {
  id: 'rice', name: 'Plain Rice', category: 'rice', servingSize: 150, servingUnit: 'g', quantityStep: 50, trackable: true,
  nutrition: { basis: { quantity: 100, unit: 'g' }, calories_kcal: 130, protein_g: 2.7, carbohydrates_g: 28, fat_g: 0.3, fiber_g: 0.4, sugar_g: null },
  verificationStatus: 'estimated', dataSource: 'est', version: 2, varieties: ['A', 'B'],
};

describe('food form', () => {
  it('round-trips an existing food without changes', () => {
    const { input, errors } = validateFoodForm(formFromFood(rice));
    expect(errors).toEqual({});
    const { id: _id, version: _v, ...expected } = rice;
    expect(input).toEqual(expected);
    expect(nutritionChanged(rice, input!)).toBe(false);
  });

  it('requires name and macros; blank fiber/sugar mean "not available"', () => {
    const { input, errors } = validateFoodForm(EMPTY_FORM);
    expect(input).toBeNull();
    expect(errors).toMatchObject({ name: 'Required.', kcal: 'Required.', protein: 'Required.', carbs: 'Required.', fat: 'Required.' });
    expect(errors.fiber).toBeUndefined();
  });

  it('rejects negative and zero values where they make no sense', () => {
    const { errors } = validateFoodForm({ ...formFromFood(rice), protein: '-1', servingSize: '0', quantityStep: 'abc' });
    expect(errors).toEqual({ protein: 'Cannot be negative.', servingSize: 'Must be more than 0.', quantityStep: 'Must be a number.' });
  });

  it('keeps the nutrition basis in the serving unit', () => {
    const { input } = validateFoodForm({ ...formFromFood(rice), servingUnit: 'bowl' });
    expect(input!.nutrition.basis.unit).toBe('bowl');
  });

  it('detects a nutrition change (which affects future logs only)', () => {
    const { input } = validateFoodForm({ ...formFromFood(rice), kcal: '140' });
    expect(nutritionChanged(rice, input!)).toBe(true);
    const renamed = validateFoodForm({ ...formFromFood(rice), name: 'Steamed Rice' }).input!;
    expect(nutritionChanged(rice, renamed)).toBe(false);
  });
});
