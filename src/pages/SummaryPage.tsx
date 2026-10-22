import { useMemo } from 'react';
import { Link } from 'react-router';
import { MEALS } from '../models';
import { useSignedIn } from '../auth/AuthContext';
import { useMessData } from '../data/MessDataContext';
import { useDayLog } from '../data/useDayLog';
import { useMessToday } from '../hooks/useMessToday';
import { addDays, formatLongDate } from '../lib/messDate';
import { DEFAULT_TARGETS, NUTRIENTS, fiberIncomplete, formatNumber, totalsOf } from '../lib/nutrition';
import { useWeights } from '../data/useWeights';
import { weightChange } from '../lib/weightChart';
import { WeightChart } from '../components/WeightChart';
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

          <WeightWeek uid={user.uid} today={today} />
        </>
      )}
    </>
  );
}

/** Body weight over the last 7 days, at the end of the Summary. */
function WeightWeek({ uid, today }: { uid: string; today: string }) {
  const weights = useWeights(uid);
  const from = addDays(today, -6);
  const week = (weights ?? []).filter((w) => w.date >= from && w.date <= today);
  const change = weightChange(week);
  return (
    <section className="mt-12" aria-labelledby="weight-week">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="weight-week" className="label text-ink">
          Weight · last 7 days
        </h2>
        <Link to="/weight" className="text-sm underline underline-offset-4">
          {week.length ? 'All weigh-ins' : 'Log weight'}
        </Link>
      </div>
      {weights === null ? null : week.length === 0 ? (
        <p className="py-4 text-muted">No weigh-ins this week.</p>
      ) : (
        <>
          <p className="mt-2 tabular-nums">
            <span className="text-title">{formatNumber(week[0]!.kg, 1)}</span>
            <span className="text-muted"> kg now</span>
            {change !== null ? (
              <span className="text-muted">
                {' '}
                · {change === 0 ? 'no change' : `${change > 0 ? '+' : '−'}${formatNumber(Math.abs(change), 1)} kg`} this week
              </span>
            ) : null}
          </p>
          <div className="mt-4">
            <WeightChart points={week} />
          </div>
        </>
      )}
    </section>
  );
}
