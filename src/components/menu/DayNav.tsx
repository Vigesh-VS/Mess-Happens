import { Link, useSearchParams } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isDateId, type DateId } from '../../models';
import { addDays } from '../../lib/messDate';

/** The selected date from ?date=yyyy-mm-dd, defaulting to today. */
export function useSelectedDate(today: DateId): DateId {
  const [params] = useSearchParams();
  const raw = params.get('date');
  return raw && isDateId(raw) ? raw : today;
}

function href(date: DateId, today: DateId): string {
  return date === today ? '?' : `?date=${date}`;
}

export function DayNav({ date, today }: { date: DateId; today: DateId }) {
  const link = 'flex size-11 items-center justify-center border border-line transition-colors hover:border-ink';
  return (
    <nav aria-label="Change day" className="flex items-center gap-2">
      <Link to={href(addDays(date, -1), today)} className={link} aria-label="Previous day">
        <ChevronLeft aria-hidden className="size-5" />
      </Link>
      {date !== today ? (
        <Link to="?" className="flex min-h-11 items-center border border-ink px-4 text-sm font-semibold hover:bg-hover">
          Today
        </Link>
      ) : null}
      <Link to={href(addDays(date, 1), today)} className={link} aria-label="Next day">
        <ChevronRight aria-hidden className="size-5" />
      </Link>
    </nav>
  );
}
