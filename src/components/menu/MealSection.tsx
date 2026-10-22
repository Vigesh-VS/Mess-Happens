import type { ReactNode } from 'react';
import {
  isSpecialMeal,
  type CatalogFood,
  type ConsumptionEntry,
  type Meal,
  type MealMenu,
  type MenuItem,
  type SpecialMenu,
} from '../../models';
import { expandSpecial, toBlocks, type MenuBlock } from '../../lib/menu';
import { capitalize } from '../../lib/messDate';
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
  /** Logged kcal for this meal (shown in the header once > 0). */
  loggedKcal?: number;
  /** Shown when the meal comes from a date override. */
  changedReason?: string | null;
  /** Logged entries for foods no longer on this meal's menu (menu changed after logging). */
  offMenu?: ConsumptionEntry[];
  /** Builds a food for an off-menu entry whose food was deleted. */
  foodForEntry?: (entry: ConsumptionEntry) => CatalogFood;
}

export function MealSection(props: MealSectionProps) {
  const { meal, menu, loggedKcal = 0, changedReason, offMenu = [] } = props;
  return (
    <section aria-labelledby={`meal-${meal}`} className="border-t border-ink pt-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={`meal-${meal}`} className="label text-ink">
          {meal}
        </h2>
        {loggedKcal > 0 ? <p className="text-sm font-semibold tabular-nums">{formatNumber(loggedKcal)} kcal</p> : null}
      </div>
      {changedReason ? <p className="mt-1 text-sm text-muted">Changed for this date — {changedReason}</p> : null}

      {menu === null ? (
        <p className="py-4 text-muted">Nothing scheduled.</p>
      ) : isSpecialMeal(menu) ? (
        <SpecialMeal {...props} special={props.specials[menu.special]} pinned={menu.combination} />
      ) : (
        <RegularMeal {...props} items={menu.items} />
      )}

      {offMenu.length > 0 && props.tracking ? (
        <div className="mt-2 border-t border-line pt-2">
          <p className="label">Also logged</p>
          <ul className="divide-y divide-line">
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
    </section>
  );
}

function RegularMeal({ meal, items, foods, choiceLabels, varieties = {}, tracking }: MealSectionProps & { items: MenuItem[] }) {
  // Condiments go in a compact, collapsed row so the main list stays short.
  const main = items.filter((i) => foods[i.foodId]?.category !== 'condiment');
  const extras = items.filter((i) => foods[i.foodId]?.category === 'condiment');
  const loggedExtras = extras.filter((i) => (tracking?.quantityOf(meal, i.foodId) ?? 0) > 0);

  return (
    <>
      <ul className="divide-y divide-line">
        {toBlocks(main).map((block) => (
          <Block key={blockKey(block)} block={block} meal={meal} foods={foods} choiceLabels={choiceLabels} varieties={varieties} tracking={tracking} />
        ))}
      </ul>
      {extras.length > 0 ? (
        <details className="group border-t border-line" open={loggedExtras.length > 0 ? true : undefined}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 truncate">
              <span className="font-semibold text-ink">Extras</span> · {extras.map((i) => foods[i.foodId]?.name ?? i.foodId).join(', ')}
            </span>
            <span aria-hidden className="shrink-0 transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <ul className="divide-y divide-line pb-2">
            {extras.map((item) => (
              <FoodRow key={item.foodId} meal={meal} item={item} food={foods[item.foodId]} tracking={tracking} variety={varieties[item.foodId]} compact />
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}

function blockKey(block: MenuBlock): string {
  return block.kind === 'item' ? block.item.foodId : `group:${block.groupId}`;
}

function Block({
  block,
  meal,
  foods,
  choiceLabels,
  varieties,
  tracking,
}: {
  block: MenuBlock;
  meal: Meal;
  foods: Record<string, CatalogFood>;
  choiceLabels: Record<string, string>;
  varieties: Record<string, string>;
  tracking?: Tracking;
}) {
  if (block.kind === 'item') {
    return <FoodRow meal={meal} item={block.item} food={foods[block.item.foodId]} tracking={tracking} variety={varieties[block.item.foodId]} />;
  }
  return (
    <ChoiceGroup label={choiceLabels[block.groupId]} items={block.items} meal={meal} tracking={tracking}>
      {block.items.map((item) => (
        <FoodRow key={item.foodId} meal={meal} item={item} food={foods[item.foodId]} tracking={tracking} variety={varieties[item.foodId]} />
      ))}
    </ChoiceGroup>
  );
}

/** "Pick one" pair. Logging both is allowed, with a soft warning. */
function ChoiceGroup({
  label,
  items,
  meal,
  tracking,
  children,
}: {
  label?: string;
  items: MenuItem[];
  meal: Meal;
  tracking?: Tracking;
  children: ReactNode;
}) {
  const loggedCount = items.filter((i) => (tracking?.quantityOf(meal, i.foodId) ?? 0) > 0).length;
  return (
    <li className="py-2">
      <div className="border-l-2 border-ink pl-4">
        <p className="label pt-2">Pick one{label ? ` — ${label.replace(/^Pick one:\s*/i, '')}` : ''}</p>
        <ul className="divide-y divide-line">{children}</ul>
        {loggedCount > 1 ? <p className="pb-2 text-sm text-muted">You logged more than one option of a pick-one pair.</p> : null}
      </div>
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
      <p className="mt-3 text-title">Special {capitalize(meal)}</p>
      {view.pinned ? null : (
        <p className="mt-1 text-sm text-muted">Combination A or B is served on rotation — log what you were given.</p>
      )}
      {view.combinations.map((c) => (
        <div key={c.id} className="mt-4">
          <p className="label text-ink">Combination {c.id}</p>
          <ul className="divide-y divide-line">
            {c.shared.map(row)}
            {c.veg.length || c.nonVeg.length ? (
              <ChoiceGroup label="veg or non-veg" items={[...c.veg, ...c.nonVeg]} meal={meal} tracking={tracking}>
                {c.veg.length ? <li className="label pt-3">Veg</li> : null}
                {c.veg.map(row)}
                {c.nonVeg.length ? <li className="label pt-3">Non-veg</li> : null}
                {c.nonVeg.map(row)}
              </ChoiceGroup>
            ) : null}
          </ul>
        </div>
      ))}
      <div className="mt-4">
        <p className="label text-ink">Served with</p>
        <ul className="divide-y divide-line">{view.alwaysServed.map(row)}</ul>
      </div>
    </div>
  );
}
