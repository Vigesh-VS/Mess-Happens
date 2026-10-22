import { DEFAULT_TIMEZONE } from '../models';

/**
 * Formats an instant as the mess sees it — in the mess timezone, never the device's.
 * (Phase 2 adds parity and date-id helpers here, reading the zone from config/academicCalendar.)
 */
export function formatMessDate(at: Date, timeZone: string = DEFAULT_TIMEZONE) {
  const weekday = new Intl.DateTimeFormat('en-IN', { timeZone, weekday: 'long' }).format(at);
  const date = new Intl.DateTimeFormat('en-IN', { timeZone, day: 'numeric', month: 'long', year: 'numeric' }).format(at);
  return { weekday, date };
}
