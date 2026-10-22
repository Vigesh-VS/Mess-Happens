import { useMemo } from 'react';
import { Link } from 'react-router';
import { MEALS } from '../models';
import { useSignedIn } from '../auth/AuthContext';
import { useMessData } from '../data/MessDataContext';
import { useDayLog } from '../data/useDayLog';
import { useMessToday } from '../hooks/useMessToday';
import { formatLongDate } from '../lib/messDate';
import { DEFAULT_TARGETS, NUTRIENTS, fiberIncomplete, formatNumber, formatQuantity, scale, totalsOf } from '../lib/nutrition';
import { DayNav, useSelectedDate } from '../components/menu/DayNav';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { Notice } from '../components/ui/Notice';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressRow } from '../components/ui/ProgressRow';

export function SummaryPage() {
  const { user, profile } = useSignedIn();
  const { timezone } = useMessData();
  const today = useMessToday(timezone);
  const date = useSelectedDate(today);
  const log = useDayLog(user.uid, date);

  const { day, byMeal } = useMemo(() => totalsOf(log.entries), [log.entries]);
  const targets = profile?.targets ?? DEFAULT_TARGETS;
  const usingDefaults = !profile?.targets;
  const entries = Object.values(log.entries).filter((e) => e.quantity > 0);
  const fiberPartial = fiberIncomplete(log.entries);

  return (
    <>
      <PageHeader eyebrow={`${formatLongDate(date)}${date === today ? ' · Today' : ''}`} title={date === today ? 'Today’s intake' : 'Intake'} actions={<DayNav date={date} today={today} />} />

      {log.error ? (
        <div className="mt-6">
          <Notice tone="error">{log.error}</Notice>
        </div>
      ) : null}

      {log.loading ? (
        <LoadingScreen />
      ) : (
        <>
          <section aria-label="Totals against targets" className="mt-6 divide-y divide-line">
            {NUTRIENTS.map((n) => (
              <ProgressRow
                key={n.key}
                label={n.label}
                value={day[n.key]}
                target={targets[n.key]}
                unit={n.unit}
                note={n.key === 'fiber_g' && fiberPartial ? 'some foods have no fiber data' : undefined}
              />
            ))}
          </section>
          <p className="mt-2 text-sm text-muted">
            {usingDefaults ? (
              <>
                Default targets — general guidance, not personal or medical advice.{' '}
                <Link to="/profile" className="text-ink underline underline-offset-4">
                  Set your own
                </Link>
                .
              </>
            ) : (
              <>
                Your targets ·{' '}
                <Link to="/profile" className="text-ink underline underline-offset-4">
                  Edit
                </Link>
              </>
            )}{' '}
            Nutrition values are estimates unless marked verified.
          </p>

          <section className="mt-12 border-t border-ink pt-4">
            <h2 className="label text-ink">By meal</h2>
            <table className="mt-2 w-full text-left tabular-nums">
              <thead>
                <tr className="text-sm text-muted">
                  <th scope="col" className="py-2 font-normal">
                    Meal
                  </th>
                  <th scope="col" className="py-2 text-right font-normal">
                    kcal
                  </th>
                  <th scope="col" className="hidden py-2 text-right font-normal sm:table-cell">
                    Protein
                  </th>
                  <th scope="col" className="hidden py-2 text-right font-normal sm:table-cell">
                    Carbs
                  </th>
                  <th scope="col" className="hidden py-2 text-right font-normal sm:table-cell">
                    Fat
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line border-t border-line">
                {MEALS.map((m) => (
                  <tr key={m}>
                    <th scope="row" className="py-3 font-semibold capitalize">
                      {m}
                    </th>
                    <td className="py-3 text-right">{formatNumber(byMeal[m].kcal)}</td>
                    <td className="hidden py-3 text-right sm:table-cell">{formatNumber(byMeal[m].protein_g, 1)} g</td>
                    <td className="hidden py-3 text-right sm:table-cell">{formatNumber(byMeal[m].carbohydrates_g, 1)} g</td>
                    <td className="hidden py-3 text-right sm:table-cell">{formatNumber(byMeal[m].fat_g, 1)} g</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mt-12 border-t border-ink pt-4">
            <div className="flex items-baseline justify-between">
              <h2 className="label text-ink">What you logged</h2>
              <Link to={date === today ? '/' : `/?date=${date}`} className="text-sm underline underline-offset-4">
                Edit
              </Link>
            </div>
            {entries.length === 0 ? (
              <p className="py-4 text-muted">Nothing logged for this day.</p>
            ) : (
              <ul className="divide-y divide-line">
                {MEALS.flatMap((m) =>
                  entries
                    .filter((e) => e.meal === m)
                    .map((e) => (
                      <li key={`${m}-${e.foodId}`} className="flex items-baseline justify-between gap-4 py-3">
                        <span className="min-w-0">
                          <span className="font-semibold">{e.name}</span>
                          <span className="text-sm text-muted">
                            {' '}
                            · {m} · {formatQuantity(e.quantity, e.unit)}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums">{formatNumber(scale(e.snapshot, e.quantity).kcal)} kcal</span>
                      </li>
                    )),
                )}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
