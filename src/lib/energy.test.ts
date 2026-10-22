import { describe, expect, it } from 'vitest';
import { bmi, bmiCategory, maintenanceKcal, suggestTargets } from './energy';

const body = { heightCm: 175, age: 20, sex: 'male', activity: 'moderate', goal: 'maintain' } as const;

describe('energy', () => {
  it('BMI and its category', () => {
    expect(bmi(70, 175)).toBeCloseTo(22.86, 2);
    expect(bmiCategory(22.86)).toBe('healthy range');
    expect(bmiCategory(17)).toBe('underweight');
    expect(bmiCategory(31)).toBe('obese range');
  });

  it('maintenance = Mifflin–St Jeor × activity', () => {
    // 10×70 + 6.25×175 − 5×20 + 5 = 1698.75; × 1.55 = 2633.06
    expect(maintenanceKcal(70, body)).toBeCloseTo(2633.06, 1);
    // female: −161 instead of +5
    expect(maintenanceKcal(60, { ...body, heightCm: 160, sex: 'female', activity: 'sedentary' })).toBeCloseTo((600 + 1000 - 100 - 161) * 1.2, 5);
  });

  it('suggested targets follow the goal and add up', () => {
    const maintain = suggestTargets(70, body);
    expect(maintain.kcal).toBe(2630);
    expect(suggestTargets(70, { ...body, goal: 'gain' }).kcal).toBe(2930);
    expect(suggestTargets(70, { ...body, goal: 'lose' }).kcal).toBe(2130);
    expect(maintain.protein_g).toBe(84);
    const fromMacros = maintain.protein_g * 4 + maintain.carbohydrates_g * 4 + maintain.fat_g * 9;
    expect(Math.abs(fromMacros - maintain.kcal)).toBeLessThan(10);
  });

  it('never suggests below 1,200 kcal', () => {
    expect(suggestTargets(40, { heightCm: 150, age: 60, sex: 'female', activity: 'sedentary', goal: 'lose' }).kcal).toBe(1200);
  });
});
