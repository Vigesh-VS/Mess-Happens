import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, flipParity, messDateOf, parityOf, weekStart, weekdayOf } from './messDate';

// The real answer from the mess: the week of Sunday 2026-10-18 is EVEN, weeks start on Sunday.
const calendar = { referenceDate: '2026-10-22', referenceParity: 'even', weekStartsOn: 'sunday' } as const;

describe('messDateOf', () => {
  it('uses the mess timezone, not the device timezone', () => {
    // 20:00 UTC on Tuesday is already 01:30 Wednesday in India.
    const at = new Date('2026-10-20T20:00:00Z');
    expect(messDateOf(at, 'Asia/Kolkata')).toBe('2026-10-21');
    expect(messDateOf(at, 'UTC')).toBe('2026-10-20');
  });

  it('a tracking day runs 00:00–23:59 IST', () => {
    expect(messDateOf(new Date('2026-10-21T18:29:59Z'), 'Asia/Kolkata')).toBe('2026-10-21'); // 23:59:59 IST
    expect(messDateOf(new Date('2026-10-21T18:30:00Z'), 'Asia/Kolkata')).toBe('2026-10-22'); // 00:00 IST
  });
});

describe('date arithmetic', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(daysBetween('2026-12-25', '2027-01-08')).toBe(14);
  });

  it('knows weekdays', () => {
    expect(weekdayOf('2026-10-18')).toBe('sunday');
    expect(weekdayOf('2026-10-22')).toBe('thursday');
  });

  it('finds the start of the week for Sunday- and Monday-start weeks', () => {
    expect(weekStart('2026-10-22', 'sunday')).toBe('2026-10-18');
    expect(weekStart('2026-10-18', 'sunday')).toBe('2026-10-18');
    expect(weekStart('2026-10-24', 'sunday')).toBe('2026-10-18');
    expect(weekStart('2026-10-22', 'monday')).toBe('2026-10-19');
    expect(weekStart('2026-10-18', 'monday')).toBe('2026-10-12'); // Sunday belongs to the previous Monday-week
  });
});

describe('parityOf', () => {
  it('matches the reference week on every day of that week', () => {
    for (const d of ['2026-10-18', '2026-10-19', '2026-10-22', '2026-10-24']) {
      expect(parityOf(d, calendar)).toBe('even');
    }
  });

  it('alternates every week, forwards and backwards', () => {
    expect(parityOf('2026-10-25', calendar)).toBe('odd'); // next Sunday
    expect(parityOf('2026-10-28', calendar)).toBe('odd');
    expect(parityOf('2026-11-01', calendar)).toBe('even');
    expect(parityOf('2026-10-17', calendar)).toBe('odd'); // last Saturday
    expect(parityOf('2026-10-11', calendar)).toBe('odd');
    expect(parityOf('2026-10-04', calendar)).toBe('even');
  });

  it('keeps alternating across the year boundary (not week-of-year based)', () => {
    // 2026-10-18 + 11 weeks = 2027-01-03 (odd number of weeks → odd)
    expect(parityOf('2027-01-03', calendar)).toBe('odd');
    expect(parityOf('2027-01-10', calendar)).toBe('even');
  });

  it('the week boundary depends on weekStartsOn', () => {
    // Sunday 2026-10-25: Sunday-start → new (odd) week; Monday-start → still the even week.
    expect(parityOf('2026-10-25', { ...calendar, weekStartsOn: 'monday' })).toBe('even');
    expect(parityOf('2026-10-26', { ...calendar, weekStartsOn: 'monday' })).toBe('odd');
  });

  it('flipping the reference parity flips every week', () => {
    const flipped = { ...calendar, referenceParity: flipParity(calendar.referenceParity) };
    for (const d of ['2026-10-22', '2026-10-28', '2027-01-03']) {
      expect(parityOf(d, flipped)).toBe(flipParity(parityOf(d, calendar)));
    }
  });
});
