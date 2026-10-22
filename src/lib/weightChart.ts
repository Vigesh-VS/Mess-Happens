import type { DateId } from '../models';
import { daysBetween } from './messDate';

export interface WeightPoint {
  date: DateId;
  kg: number;
}

export interface ChartGeometry {
  /** y-axis domain in kg, padded and rounded to whole kg. */
  min: number;
  max: number;
  ticks: number[];
  /** Point positions in 0..1 (x: time, y: 0 = top). */
  points: (WeightPoint & { x: number; y: number })[];
}

/** Lays weigh-ins out on a time axis (gaps between weigh-ins stay proportional). */
export function chartGeometry(points: WeightPoint[]): ChartGeometry | null {
  if (points.length === 0) return null;
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const kgs = sorted.map((p) => p.kg);
  let min = Math.floor(Math.min(...kgs) - 1);
  let max = Math.ceil(Math.max(...kgs) + 1);
  if (max - min < 4) {
    const mid = (min + max) / 2;
    min = Math.floor(mid - 2);
    max = Math.ceil(mid + 2);
  }
  const step = Math.max(1, Math.ceil((max - min) / 4));
  const ticks: number[] = [];
  for (let t = min; t <= max; t += step) ticks.push(t);

  const span = daysBetween(sorted[0]!.date, sorted.at(-1)!.date);
  return {
    min,
    max,
    ticks,
    points: sorted.map((p) => ({
      ...p,
      x: span === 0 ? 0.5 : daysBetween(sorted[0]!.date, p.date) / span,
      y: (max - p.kg) / (max - min),
    })),
  };
}

/** Change from the first to the last weigh-in in the range, in kg (rounded to 0.1). */
export function weightChange(points: WeightPoint[]): number | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return Math.round((sorted.at(-1)!.kg - sorted[0]!.kg) * 10) / 10;
}
