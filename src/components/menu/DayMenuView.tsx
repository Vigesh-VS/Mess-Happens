import type { ConsumptionEntry, CatalogFood, DayTotals, Meal } from '../../models';
import type { ResolvedMeal } from '../../lib/menu';
import { useMessData } from '../../data/MessDataContext';
import { MealSection } from './MealSection';
import type { Tracking } from './types';

interface DayMenuViewProps {
  meals: ResolvedMeal[];
  varieties?: Record<string, string>;
  overrideReason?: string | null;
  tracking?: Tracking;
  byMeal?: Record<Meal, DayTotals>;
  offMenu?: Partial<Record<Meal, ConsumptionEntry[]>>;
  foodForEntry?: (entry: ConsumptionEntry) => CatalogFood;
  /** Override the live data (admin previews of unpublished drafts). */
  foods?: Record<string, CatalogFood>;
}

export function DayMenuView({ meals, varieties, overrideReason, tracking, byMeal, offMenu, foodForEntry, foods }: DayMenuViewProps) {
  const data = useMessData();
  const choiceLabels = data.menuConfig?.choiceGroups ?? {};
  return (
    <div className="mt-12 space-y-16">
      {meals.map((m) => (
        <MealSection
          key={m.meal}
          meal={m.meal}
          menu={m.menu}
          foods={foods ?? data.foods}
          specials={data.specials}
          choiceLabels={choiceLabels}
          varieties={varieties}
          tracking={tracking}
          loggedKcal={byMeal?.[m.meal].kcal}
          changedReason={m.source === 'override' ? (overrideReason ?? 'special change') : null}
          offMenu={offMenu?.[m.meal]}
          foodForEntry={foodForEntry}
        />
      ))}
    </div>
  );
}
