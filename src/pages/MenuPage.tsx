import { useState } from 'react';
import { Link } from 'react-router';
import { MEALS, PARITIES, WEEKDAYS, menuDocId, type Parity, type Weekday } from '../models';
import { useMessData } from '../data/MessDataContext';
import { useMessToday } from '../hooks/useMessToday';
import { capitalize, formatShortDate, parityOf, weekdayOf } from '../lib/messDate';
import { CalendarMissing } from '../components/menu/CalendarMissing';
import { DayMenuView } from '../components/menu/DayMenuView';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { PageHeader } from '../components/ui/PageHeader';
import { Segmented } from '../components/ui/Segmented';

/** Browse the recurring odd/even templates, plus upcoming date-specific changes. */
export function MenuPage() {
  const data = useMessData();
  const today = useMessToday(data.timezone);
  const currentParity = data.calendar ? parityOf(today, data.calendar) : null;
  // Until the user picks one, follow the current week (the calendar may load after mount).
  const [chosenParity, setParity] = useState<Parity | null>(null);
  const parity = chosenParity ?? currentParity ?? 'odd';
  const [weekday, setWeekday] = useState<Weekday>(weekdayOf(today));

  const template = data.menus[menuDocId(parity, weekday)];
  const meals = MEALS.map((meal) => ({ meal, menu: template?.meals[meal] ?? null, source: 'template' as const }));
  const upcoming = Object.entries(data.overrides)
    .filter(([date]) => date >= today)
    .sort(([a], [b]) => a.localeCompare(b));
  const isCurrent = parity === currentParity && weekday === weekdayOf(today);

  return (
    <>
      <PageHeader
        eyebrow={currentParity ? `This is an ${currentParity} week` : 'Odd and even weeks'}
        title={`${capitalize(weekday)}`}
      />

      {!data.ready ? (
        <LoadingScreen label="Loading menu" />
      ) : (
        <>
          {data.calendar ? null : (
            <div className="mt-8">
              <CalendarMissing />
            </div>
          )}

          <div className="mt-8 space-y-3">
            <Segmented
              label="Week"
              value={parity}
              onChange={setParity}
              options={PARITIES.map((p) => ({ value: p, label: `${capitalize(p)} week`, hint: p === currentParity ? 'this week' : undefined }))}
            />
            <Segmented
              label="Day"
              size="sm"
              value={weekday}
              onChange={setWeekday}
              options={WEEKDAYS.map((d) => ({ value: d, label: capitalize(d).slice(0, 3) }))}
            />
            <p className="text-sm text-muted">
              {isCurrent ? 'Today’s regular menu. ' : ''}
              Regular {parity}-week menu — date-specific changes are listed below and shown on the Today screen.
            </p>
          </div>

          <DayMenuView meals={meals} />

          <section className="mt-12 border-t border-ink pt-4">
            <h2 className="label text-ink">Upcoming changes</h2>
            {upcoming.length === 0 ? (
              <p className="py-4 text-muted">No date-specific changes scheduled.</p>
            ) : (
              <ul className="divide-y divide-line">
                {upcoming.map(([date, o]) => (
                  <li key={date}>
                    <Link to={`/?date=${date}`} className="flex min-h-14 items-center justify-between gap-4 hover:bg-hover">
                      <span className="font-semibold">{formatShortDate(date)}</span>
                      <span className="min-w-0 truncate text-muted">
                        {o.reason} · {MEALS.filter((m) => o.meals[m]).join(', ') || 'varieties'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
