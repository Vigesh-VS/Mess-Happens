// Maintenance-calorie estimate and suggested targets. General guidance, not medical advice.
import type { BodyDetails, NutritionTargets } from '../models';

export const ACTIVITY: Record<BodyDetails['activity'], { label: string; hint: string; factor: number }> = {
  sedentary: { label: 'Sedentary', hint: 'mostly sitting, little exercise', factor: 1.2 },
  light: { label: 'Light', hint: 'exercise 1–3 days a week', factor: 1.375 },
  moderate: { label: 'Moderate', hint: 'exercise 3–5 days a week', factor: 1.55 },
  active: { label: 'Active', hint: 'hard exercise 6–7 days a week', factor: 1.725 },
};

export const GOALS: Record<BodyDetails['goal'], { label: string; kcalDelta: number; proteinPerKg: number }> = {
  lose: { label: 'Lose weight', kcalDelta: -500, proteinPerKg: 1.6 },
  maintain: { label: 'Maintain', kcalDelta: 0, proteinPerKg: 1.2 },
  gain: { label: 'Gain weight', kcalDelta: 300, proteinPerKg: 1.6 },
};

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiCategory(value: number): string {
  if (value < 18.5) return 'underweight';
  if (value < 25) return 'healthy range';
  if (value < 30) return 'overweight';
  return 'obese range';
}

/** Mifflin–St Jeor resting energy × activity factor, in kcal/day. */
export function maintenanceKcal(weightKg: number, body: Pick<BodyDetails, 'heightCm' | 'age' | 'sex' | 'activity'>): number {
  const bmr = 10 * weightKg + 6.25 * body.heightCm - 5 * body.age + (body.sex === 'male' ? 5 : -161);
  return bmr * ACTIVITY[body.activity].factor;
}

const round10 = (v: number) => Math.round(v / 10) * 10;

/** Within 1 kg of the current weight counts as "maintain". */
export function goalFor(currentKg: number, targetKg: number | undefined): BodyDetails['goal'] {
  if (targetKg === undefined || Math.abs(targetKg - currentKg) < 1) return 'maintain';
  return targetKg < currentKg ? 'lose' : 'gain';
}

/**
 * Targets for a goal: calories = maintenance ± goal; protein by target body weight (current
 * weight if none is set); fat 25% of calories; carbs the remainder; fiber 14 g per 1,000 kcal.
 */
export function suggestTargets(weightKg: number, body: BodyDetails): NutritionTargets {
  const kcal = round10(Math.max(1200, maintenanceKcal(weightKg, body) + GOALS[body.goal].kcalDelta));
  const protein = Math.round((body.targetWeightKg ?? weightKg) * GOALS[body.goal].proteinPerKg);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((kcal / 1000) * 14);
  return { kcal, protein_g: protein, carbohydrates_g: carbs, fat_g: fat, fiber_g: fiber };
}

/** ~7,700 kcal per kg of body weight. */
const KCAL_PER_KG = 7700;

/** Rough weeks to reach the target weight at the suggested calories; null when maintaining. */
export function weeksToTarget(weightKg: number, body: BodyDetails): number | null {
  if (body.targetWeightKg === undefined || body.goal === 'maintain') return null;
  const dailyGap = Math.abs(suggestTargets(weightKg, body).kcal - maintenanceKcal(weightKg, body));
  if (dailyGap < 50) return null;
  return Math.ceil((Math.abs(body.targetWeightKg - weightKg) * KCAL_PER_KG) / (dailyGap * 7));
}
