// Form state for the Food Editor: strings while typing, validated into a FoodInput on save.
import { type CatalogFood, type FoodCategory, type ServingUnit, type VerificationStatus } from '../../models';
import type { FoodInput } from '../../data/adminWrites';

export interface FoodFormState {
  name: string;
  category: FoodCategory;
  servingSize: string;
  servingUnit: ServingUnit;
  quantityStep: string;
  trackable: boolean;
  basisQuantity: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sugar: string;
  verificationStatus: VerificationStatus;
  dataSource: string;
  note: string;
  varieties: string;
}

export const EMPTY_FORM: FoodFormState = {
  name: '',
  category: 'curry',
  servingSize: '100',
  servingUnit: 'g',
  quantityStep: '50',
  trackable: true,
  basisQuantity: '100',
  kcal: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  sugar: '',
  verificationStatus: 'estimated',
  dataSource: '',
  note: '',
  varieties: '',
};

const str = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

export function formFromFood(f: CatalogFood): FoodFormState {
  return {
    name: f.name,
    category: f.category,
    servingSize: str(f.servingSize),
    servingUnit: f.servingUnit,
    quantityStep: str(f.quantityStep),
    trackable: f.trackable,
    basisQuantity: str(f.nutrition.basis.quantity),
    kcal: str(f.nutrition.calories_kcal),
    protein: str(f.nutrition.protein_g),
    carbs: str(f.nutrition.carbohydrates_g),
    fat: str(f.nutrition.fat_g),
    fiber: str(f.nutrition.fiber_g),
    sugar: str(f.nutrition.sugar_g),
    verificationStatus: f.verificationStatus,
    dataSource: f.dataSource,
    note: f.note ?? '',
    varieties: (f.varieties ?? []).join(', '),
  };
}

export type FormErrors = Partial<Record<keyof FoodFormState, string>>;

function num(value: string, { positive = false, optional = false } = {}): { value: number | null; error?: string } {
  const t = value.trim();
  if (t === '') return optional ? { value: null } : { value: null, error: 'Required.' };
  const n = Number(t);
  if (!Number.isFinite(n)) return { value: null, error: 'Must be a number.' };
  if (positive ? n <= 0 : n < 0) return { value: null, error: positive ? 'Must be more than 0.' : 'Cannot be negative.' };
  return { value: n };
}

/** Mirrors the Security Rules so most mistakes are caught before a round trip. */
export function validateFoodForm(s: FoodFormState): { input: FoodInput | null; errors: FormErrors } {
  const errors: FormErrors = {};
  const name = s.name.trim();
  if (!name) errors.name = 'Required.';
  else if (name.length > 100) errors.name = 'At most 100 characters.';

  const fields = {
    servingSize: num(s.servingSize, { positive: true }),
    quantityStep: num(s.quantityStep, { positive: true }),
    basisQuantity: num(s.basisQuantity, { positive: true }),
    kcal: num(s.kcal),
    protein: num(s.protein),
    carbs: num(s.carbs),
    fat: num(s.fat),
    fiber: num(s.fiber, { optional: true }),
    sugar: num(s.sugar, { optional: true }),
  };
  for (const [k, r] of Object.entries(fields)) if (r.error) errors[k as keyof FoodFormState] = r.error;
  if (s.dataSource.length > 1000) errors.dataSource = 'At most 1000 characters.';
  if (s.note.length > 500) errors.note = 'At most 500 characters.';

  const varieties = s.varieties.split(',').map((v) => v.trim()).filter(Boolean);
  if (varieties.length > 30) errors.varieties = 'At most 30 varieties.';

  if (Object.keys(errors).length) return { input: null, errors };

  const input: FoodInput = {
    name,
    category: s.category,
    servingSize: fields.servingSize.value!,
    servingUnit: s.servingUnit,
    quantityStep: fields.quantityStep.value!,
    trackable: s.trackable,
    nutrition: {
      // The basis is always in the serving unit, so portion maths never mixes units.
      basis: { quantity: fields.basisQuantity.value!, unit: s.servingUnit },
      calories_kcal: fields.kcal.value!,
      protein_g: fields.protein.value!,
      carbohydrates_g: fields.carbs.value!,
      fat_g: fields.fat.value!,
      fiber_g: fields.fiber.value,
      sugar_g: fields.sugar.value,
    },
    verificationStatus: s.verificationStatus,
    dataSource: s.dataSource.trim(),
    ...(s.note.trim() ? { note: s.note.trim() } : {}),
    ...(varieties.length ? { varieties } : {}),
  };
  return { input, errors };
}

/** True if a change would alter calories/macros for future logs. */
export function nutritionChanged(before: CatalogFood, input: FoodInput): boolean {
  const a = before.nutrition;
  const b = input.nutrition;
  return (
    a.basis.quantity !== b.basis.quantity ||
    a.basis.unit !== b.basis.unit ||
    a.calories_kcal !== b.calories_kcal ||
    a.protein_g !== b.protein_g ||
    a.carbohydrates_g !== b.carbohydrates_g ||
    a.fat_g !== b.fat_g ||
    a.fiber_g !== b.fiber_g ||
    a.sugar_g !== b.sugar_g
  );
}
