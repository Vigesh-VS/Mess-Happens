import type { CatalogFood } from '../../models';
import { formatNumber, formatQuantity, perServing } from '../../lib/nutrition';

const NOTE: Record<CatalogFood['verificationStatus'], string> = {
  estimated: 'Estimate — a typical value for this dish. The real value may vary.',
  'needs-review': 'Estimate — a typical value for this dish. The real value may vary.',
  verified: 'Checked values for this dish.',
};

export function NutritionDetails({ id, food }: { id: string; food: CatalogFood }) {
  const s = perServing(food);
  const n = food.nutrition;
  const factor = food.servingSize / n.basis.quantity;
  const rows: [string, string][] = [
    ['Calories', `${formatNumber(s.kcal)} kcal`],
    ['Protein', `${formatNumber(s.protein_g, 1)} g`],
    ['Carbohydrates', `${formatNumber(s.carbohydrates_g, 1)} g`],
    ['Fat', `${formatNumber(s.fat_g, 1)} g`],
    ['Fiber', n.fiber_g === null ? '—' : `${formatNumber(n.fiber_g * factor, 1)} g`],
    ['Sugar', n.sugar_g === null ? '—' : `${formatNumber(n.sugar_g * factor, 1)} g`],
  ];

  return (
    <div id={id} className="mt-3 border-l-2 border-ink pl-4">
      <p className="label">Per {formatQuantity(food.servingSize, food.servingUnit)}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-muted">{k}</dt>
            <dd className="tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted">{NOTE[food.verificationStatus]}</p>
    </div>
  );
}
