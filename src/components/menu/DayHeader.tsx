import type { DateId, Parity } from '../../models';
import { addDays, capitalize, formatDateId, formatWeekdayName } from '../../lib/messDate';
import { DayNav } from './DayNav';

function relativeLabel(date: DateId, today: DateId): string {
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  if (date === addDays(today, 1)) return 'Tomorrow';
  return date < today ? 'Past day' : 'Upcoming';
}

/**
 * Top of the Today screen: the date first, then the weekday and which week it is.
 *
 *   TODAY                                ‹  ›
 *   22 October
 *   Thursday · Even week
 */
export function DayHeader({ date, today, parity, status = null }: { date: DateId; today: DateId; parity: Parity | null; status?: string | null }) {
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return (
    <header>
      <div className="flex items-center justify-between gap-4">
        <p className="label">
          {relativeLabel(date, today)}
          {/* Sync state sits on this line so it never shifts the menu. */}
          <span role="status" className="ml-3 normal-case tracking-normal">
            {status}
          </span>
        </p>
        <DayNav date={date} today={today} />
      </div>
      <h1 className="text-display mt-4">{formatDateId(date, sameYear ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' })}</h1>
      <p className="mt-3 text-title">
        <span className="font-normal text-muted">{formatWeekdayName(date)}</span>
        {parity ? (
          <>
            <span aria-hidden className="font-normal text-muted">
              {' '}
              ·{' '}
            </span>
            <span>{capitalize(parity)} week</span>
          </>
        ) : null}
      </p>
    </header>
  );
}
