import { useMemo } from 'react';
import { Link } from 'react-router';
import { entryKey, type CatalogFood, type ConsumptionEntry, type Meal } from '../models';
import { useAuth } from '../auth/AuthContext';
import { useMessData } from '../data/MessDataContext';
import { useDayLog } from '../data/useDayLog';
import { useMessToday } from '../hooks/useMessToday';
import { useOnline } from '../hooks/useOnline';
import { foodIdsOf, resolveDay } from '../lib/menu';
import { totalsOf } from '../lib/nutrition';
import { CalendarMissing } from '../components/menu/CalendarMissing';
import { DayMenuView } from '../components/menu/DayMenuView';
import { DayHeader } from '../components/menu/DayHeader';
import { QuickWeight } from '../components/QuickWeight';
import { useSelectedDate } from '../components/menu/DayNav';
import type { Tracking } from '../components/menu/types';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { Notice } from '../components/ui/Notice';

/** A stand-in for a logged food that has since been deleted, so the entry can still be corrected. */
function foodFromEntry(e: ConsumptionEntry): CatalogFood {
  return {
    id: e.foodId,
    name: e.name,
    category: 'side',
    servingSize: e.snapshot.basisQuantity,
    servingUnit: e.unit,
    quantityStep: e.unit === 'g' || e.unit === 'ml' ? 50 : 1,
    trackable: true,
    nutrition: {
      basis: { quantity: e.snapshot.basisQuantity, unit: e.snapshot.basisUnit },
      calories_kcal: e.snapshot.kcal,
      protein_g: e.snapshot.protein_g,
      carbohydrates_g: e.snapshot.carbohydrates_g,
      fat_g: e.snapshot.fat_g,
      fiber_g: e.snapshot.fiber_g,
      sugar_g: null,
    },
    verificationStatus: 'estimated',
    dataSource: 'No longer in the food list — values as logged.',
    version: e.snapshot.foodVersion,
  };
}

export function TodayPage() {
  const { state } = useAuth();
  const uid = state.status === 'signedIn' ? state.user.uid : null;
  const data = useMessData();
  const today = useMessToday(data.timezone);
  const date = useSelectedDate(today);
  const day = resolveDay(date, data.calendar, data.menus, data.overrides);
  const log = useDayLog(uid, date);
  const online = useOnline();

  const { byMeal } = useMemo(() => totalsOf(log.entries), [log.entries]);

  const offMenu = useMemo(() => {
    const out: Partial<Record<Meal, ConsumptionEntry[]>> = {};
    for (const m of day.meals) {
      const onMenu = foodIdsOf(m.menu, data.specials);
      const extra = Object.values(log.entries).filter((e) => e.meal === m.meal && e.quantity > 0 && !onMenu.has(e.foodId));
      if (extra.length) out[m.meal] = extra;
    }
    return out;
  }, [day.meals, data.specials, log.entries]);

  const isFuture = date > today;
  const tracking: Tracking | undefined = uid === null ? undefined : {
    quantityOf: (meal, foodId) => log.entries[entryKey(meal, foodId)]?.quantity ?? 0,
    step: log.step,
    setQuantity: log.setQuantity,
    disabledReason: isFuture ? 'You can log food once the day arrives.' : log.loading ? 'Loading' : null,
  };

  return (
    <>
      <DayHeader
        date={date}
        today={today}
        parity={day.parity}
        status={log.pending ? (online ? 'Saving…' : 'Offline — will sync') : null}
        action={uid ? <QuickWeight uid={uid} today={today} /> : null}
      />

      {state.status === 'signedOut' ? (
        <p className="mt-6 text-sm text-muted">
          <Link to="/login" state={{ from: date === today ? '/' : `/?date=${date}` }} className="font-semibold text-ink underline underline-offset-4">
            Sign in
          </Link>{' '}
          to track what you eat — the menu is open to everyone.
        </p>
      ) : state.status === 'signedIn' && isFuture ? (
        <p className="mt-6 text-sm text-muted">Upcoming — logging opens on the day.</p>
      ) : null}

      {data.error || log.error ? (
        <div className="mt-6">
          <Notice tone="error" title="Something went wrong">
            {data.error ?? log.error}
          </Notice>
        </div>
      ) : null}

      {!data.ready ? (
        <LoadingScreen label="Loading menu" />
      ) : (
        <>
          {data.calendar ? null : (
            <div className="mt-8">
              <CalendarMissing />
            </div>
          )}
          <DayMenuView
            meals={day.meals}
            varieties={day.varieties}
            overrideReason={day.override?.reason}
            tracking={tracking}
            byMeal={byMeal}
            offMenu={offMenu}
            foodForEntry={foodFromEntry}
          />
        </>
      )}
    </>
  );
}
