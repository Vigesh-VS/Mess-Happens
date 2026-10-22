// Mess dates are calendar dates (yyyy-mm-dd) in the mess timezone, never the device's.
// All arithmetic is done on those date ids via UTC midnight, so DST and device zones can't shift a day.
import { DEFAULT_TIMEZONE, WEEKDAYS, type AcademicCalendar, type DateId, type Parity, type Weekday } from '../models';

const DAY_MS = 86_400_000;

function toUtc(dateId: DateId): Date {
  const [y, m, d] = dateId.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(date: Date): DateId {
  return date.toISOString().slice(0, 10);
}

/** The mess date of an instant, e.g. 2026-10-21T20:00Z → "2026-10-22" in Asia/Kolkata. */
export function messDateOf(at: Date, timeZone: string = DEFAULT_TIMEZONE): DateId {
  // en-CA formats as yyyy-mm-dd.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

export function addDays(dateId: DateId, days: number): DateId {
  return fromUtc(new Date(toUtc(dateId).getTime() + days * DAY_MS));
}

/** Whole days from a to b (b − a). */
export function daysBetween(a: DateId, b: DateId): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / DAY_MS);
}

export function weekdayOf(dateId: DateId): Weekday {
  return WEEKDAYS[toUtc(dateId).getUTCDay()]!;
}

/** First day of the mess week containing dateId. */
export function weekStart(dateId: DateId, weekStartsOn: AcademicCalendar['weekStartsOn']): DateId {
  const dow = toUtc(dateId).getUTCDay(); // 0 = Sunday
  const offset = weekStartsOn === 'sunday' ? dow : (dow + 6) % 7;
  return addDays(dateId, -offset);
}

export function flipParity(p: Parity): Parity {
  return p === 'odd' ? 'even' : 'odd';
}

type CalendarRef = Pick<AcademicCalendar, 'referenceDate' | 'referenceParity' | 'weekStartsOn'>;

/**
 * Week parity: the reference week has `referenceParity`, and parity flips once per whole
 * week before or after it. Works across year boundaries (no week-of-year numbering).
 */
export function parityOf(dateId: DateId, calendar: CalendarRef): Parity {
  const weeks = daysBetween(weekStart(calendar.referenceDate, calendar.weekStartsOn), weekStart(dateId, calendar.weekStartsOn)) / 7;
  return Math.abs(weeks) % 2 === 0 ? calendar.referenceParity : flipParity(calendar.referenceParity);
}

/** Display helpers (format the date id itself, so the device zone is irrelevant). */
export function formatDateId(dateId: DateId, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-IN', { ...options, timeZone: 'UTC' }).format(toUtc(dateId));
}

export function formatLongDate(dateId: DateId): string {
  return formatDateId(dateId, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatWeekdayName(dateId: DateId): string {
  return formatDateId(dateId, { weekday: 'long' });
}

export function formatShortDate(dateId: DateId): string {
  return formatDateId(dateId, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
