import { useId, useState } from 'react';
import type { CatalogFood, Meal, MenuItem } from '../../models';
import { countOf, formatQuantity, isCountable, stepOf } from '../../lib/nutrition';
import { NutritionDetails } from './NutritionDetails';
import { Stepper } from './Stepper';
import type { Tracking } from './types';

interface FoodRowProps {
  meal: Meal;
  item: MenuItem;
  food: CatalogFood | undefined;
  tracking?: Tracking;
  /** The variety an admin set for this date, e.g. "Mango". */
  variety?: string;
  compact?: boolean;
}

/**
 * One menu item: name, what one tap adds (e.g. "150 g" or "1 slice"), and the counter.
 * Nutrition is not shown here — it's in the food's details (tap the name), at the end of each
 * meal, and on the Summary screen.
 */
export function FoodRow({ meal, item, food, tracking, variety, compact = false }: FoodRowProps) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();

  if (!food) {
    return (
      <li className="py-3 text-muted">
        Unknown item <code className="text-xs">{item.foodId}</code>
      </li>
    );
  }

  const quantity = tracking?.quantityOf(meal, food.id) ?? 0;
  const showStepper = tracking && food.trackable;
  const countable = isCountable(food.servingUnit);

  return (
    <li className={compact ? 'py-2.5' : 'py-4'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={detailsId}
            className={[
              'text-left leading-tight underline-offset-4 hover:underline',
              compact ? 'text-base font-semibold' : 'text-lg font-bold tracking-tight sm:text-xl',
            ].join(' ')}
          >
            {food.name}
          </button>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm text-muted">
            <span>{formatQuantity(stepOf(food), food.servingUnit)}</span>
            {item.servingQuantity ? <span>· {item.servingQuantity} served</span> : null}
            {item.limited ? <span className="label text-ink">Limited</span> : null}
          </p>
          {variety || food.varieties?.length ? (
            <p className="mt-0.5 text-sm text-muted">{variety ? `Today: ${variety}` : `Rotates: ${food.varieties!.join(', ')}`}</p>
          ) : null}
        </div>

        {showStepper ? (
          <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
            <Stepper
              label={food.name}
              quantity={quantity}
              unit={food.servingUnit}
              count={countOf(food, quantity)}
              disabled={tracking.disabledReason !== null}
              onStep={(dir) => tracking.step(meal, food, dir)}
              onSet={(q) => tracking.setQuantity(meal, food, q)}
            />
            {quantity > 0 && !countable ? <p className="text-xs tabular-nums text-muted">{formatQuantity(quantity, food.servingUnit)}</p> : null}
          </div>
        ) : tracking && !food.trackable ? (
          <p className="shrink-0 pt-1 text-xs text-muted">not tracked</p>
        ) : null}
      </div>

      {open ? <NutritionDetails id={detailsId} food={food} /> : null}
    </li>
  );
}
