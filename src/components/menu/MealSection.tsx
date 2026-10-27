import { Fragment } from 'react';
import {
  isSpecialMeal,
  type CatalogFood,
  type ConsumptionEntry,
  type DayTotals,
  type Meal,
  type MealMenu,
  type MenuItem,
  type SpecialMenu,
} from '../../models';
import { expandSpecial, toBlocks } from '../../lib/menu';
import { formatNumber } from '../../lib/nutrition';
import { FoodRow } from './FoodRow';
import type { Tracking } from './types';

interface MealSectionProps {
  meal: Meal;
  menu: MealMenu | null;
  foods: Record<string, CatalogFood>;
  specials: Record<string, SpecialMenu>;
  choiceLabels: Record<string, string>;
  varieties?: Record<string, string>;
  tracking?: Tracking;
  /** What's logged for this meal — summarised at the end of the section once anything is. */
  loggedTotals?: DayTotals;
  /** Shown when the meal comes from a date override. */
  changedReason?: string | null;
  /** Logged entries for foods no longer on this meal's menu (menu changed after logging). */
  offMenu?: ConsumptionEntry[];
  /** Builds a food for an off-menu entry whose food was deleted. */
  foodForEntry?: (entry: ConsumptionEntry) => CatalogFood;
}

export function MealSection(props: MealSectionProps) {
  const { meal, menu, loggedTotals, changedReason, offMenu = [] } = props;
  return (
    <section aria-labelledby={`meal-${meal}`}>
      <h2 id={`meal-${meal}`} className="text-section capitalize">
        {meal}
      </h2>
      {changedReason ? <p className="mt-1 text-sm text-muted">Changed for this date — {changedReason}</p> : null}

      {menu === null ? (
        <p className="py-4 text-muted">Nothing scheduled.</p>
      ) : isSpecialMeal(menu) ? (
        <SpecialMeal {...props} special={props.specials[menu.special]} pinned={menu.combination} />
      ) : (
        <RegularMeal {...props} items={menu.items} />
      )}

      {offMenu.length > 0 && props.tracking ? (
        <div className="mt-6">
          <p className="label">Also logged</p>
          <ul>
            {offMenu.map((e) => (
              <FoodRow
                key={e.foodId}
                meal={meal}
                item={{ foodId: e.foodId }}
                food={props.foods[e.foodId] ?? props.foodForEntry?.(e)}
                tracking={props.tracking}
                compact
              />
            ))}
          </ul>
        </div>
      ) : null}

      {props.tracking && loggedTotals && loggedTotals.kcal > 0 ? <MealTotals meal={meal} totals={loggedTotals} /> : null}
    </section>
  );
}

/** End-of-meal summary in a light box, so it reads apart from the food list. */
function MealTotals({ meal, totals }: { meal: Meal; totals: DayTotals }) {
  const figures: [string, string, string][] = [
    [formatNumber(totals.kcal), 'kcal', ''],
    [formatNumber(totals.protein_g, 1), 'g', 'protein'],
    [formatNumber(totals.carbohydrates_g, 1), 'g', 'carbs'],
    [formatNumber(totals.fat_g, 1), 'g', 'fat'],
    [formatNumber(totals.fiber_g, 1), 'g', 'fiber'],
  ];
  return (
    <div className="mt-6 rounded-sm border border-line px-4 py-3" aria-label={`${meal} total`}>
      <p className="label">{meal} total</p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1 tabular-nums">
        {figures.map(([value, unit, name]) => (
          <span key={name || unit}>
            <span className="text-lg font-bold">{value}</span>
            <span className="text-sm text-muted">
              {' '}
              {unit}
              {name ? ` ${name}` : ''}
            </span>
          </span>
        ))}
      </p>
    </div>
  );
}

function RegularMeal({ meal, items, foods, varieties = {}, tracking }: MealSectionProps & { items: MenuItem[] }) {
  // Condiments go in a compact, collapsed row so the main list stays short.
  const main = items.filter((i) => foods[i.foodId]?.category !== 'condiment');
  const extras = items.filter((i) => foods[i.foodId]?.category === 'condiment');
  const loggedExtras = extras.filter((i) => (tracking?.quantityOf(meal, i.foodId) ?? 0) > 0);

  return (
    <>
      <ul className="mt-2">
        {toBlocks(main).map((block) =>
          block.kind === 'item' ? (
            <FoodRow key={block.item.foodId} meal={meal} item={block.item} food={foods[block.item.foodId]} tracking={tracking} variety={varieties[block.item.foodId]} />
          ) : (
            <EitherOr key={block.groupId} meal={meal} items={block.items} foods={foods} varieties={varieties} tracking={tracking} />
          ),
        )}
      </ul>
      {extras.length > 0 ? (
        <details className="group mt-2" open={loggedExtras.length > 0 ? true : undefined}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 truncate">
              <span className="font-semibold text-ink">Extras</span> · {extras.map((i) => foods[i.foodId]?.name ?? i.foodId).join(', ')}
            </span>
            <span aria-hidden className="shrink-0 transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <ul className="pb-2">
            {extras.map((item) => (
              <FoodRow key={item.foodId} meal={meal} item={item} food={foods[item.foodId]} tracking={tracking} variety={varieties[item.foodId]} compact />
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}

/**
 * "Item 1 / Item 2" on the mess menu: only one of them is served to you, so they're shown
 * together with "or", and logging one clears the other.
 */
function EitherOr({
  meal,
  items,
  foods,
  varieties,
  tracking,
}: {
  meal: Meal;
  items: MenuItem[];
  foods: Record<string, CatalogFood>;
  varieties: Record<string, string>;
  tracking?: Tracking;
}) {
  const options = items.map((i) => foods[i.foodId]).filter((f): f is CatalogFood => !!f);
  const exclusive: Tracking | undefined = tracking && {
    ...tracking,
    step: (m, food, direction) => {
      if (direction === 1) clearOthers(m, food);
      tracking.step(m, food, direction);
    },
    setQuantity: (m, food, quantity) => {
      if (quantity > 0) clearOthers(m, food);
      tracking.setQuantity(m, food, quantity);
    },
  };
  function clearOthers(m: Meal, food: CatalogFood) {
    for (const other of options) {
      if (other.id !== food.id && tracking!.quantityOf(m, other.id) > 0) tracking!.setQuantity(m, other, 0);
    }
  }

  return (
    <li className="my-2 border-l-2 border-line pl-4">
      <ul>
        {items.map((item, i) => (
          <Fragment key={item.foodId}>
            {i > 0 ? (
              <li className="label -my-1">
                or
              </li>
            ) : null}
            <FoodRow meal={meal} item={item} food={foods[item.foodId]} tracking={exclusive} variety={varieties[item.foodId]} />
          </Fragment>
        ))}
      </ul>
    </li>
  );
}

function SpecialMeal({
  meal,
  special,
  pinned,
  foods,
  tracking,
}: MealSectionProps & { special: SpecialMenu | undefined; pinned?: 'A' | 'B' }) {
  if (!special) return <p className="py-4 text-muted">Special menu not found.</p>;
  const view = expandSpecial(special, pinned);
  const row = (item: MenuItem) => <FoodRow key={item.foodId} meal={meal} item={item} food={foods[item.foodId]} tracking={tracking} />;

  return (
    <div>
      <p className="mt-2 text-lg font-semibold">Special {meal}</p>
      {view.pinned ? null : (
        <p className="mt-1 text-sm text-muted">Combination A or B is served on rotation — log what you were given.</p>
      )}
      {view.combinations.map((c) => (
        <div key={c.id} className="mt-4">
          <p className="label text-ink">Combination {c.id}</p>
          <ul>
            {c.shared.map(row)}
            {c.veg.length || c.nonVeg.length ? (
              <>
                {c.veg.length ? <li className="label pt-3">Veg</li> : null}
                {c.veg.map(row)}
                {c.nonVeg.length ? <li className="label pt-3">Non-veg</li> : null}
                {c.nonVeg.map(row)}
              </>
            ) : null}
          </ul>
        </div>
      ))}
      <div className="mt-4">
        <p className="label text-ink">Served with</p>
        <ul>{view.alwaysServed.map(row)}</ul>
      </div>
    </div>
  );
}
