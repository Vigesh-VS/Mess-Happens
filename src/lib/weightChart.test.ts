import { describe, expect, it } from 'vitest';
import { chartGeometry, weightChange } from './weightChart';

describe('chartGeometry', () => {
  it('returns null with no data and centres a single point', () => {
    expect(chartGeometry([])).toBeNull();
    const g = chartGeometry([{ date: '2026-10-22', kg: 68 }])!;
    expect(g.points[0]!.x).toBe(0.5);
    expect(g.max - g.min).toBeGreaterThanOrEqual(4);
  });

  it('sorts by date and keeps time gaps proportional', () => {
    const g = chartGeometry([
      { date: '2026-10-31', kg: 67 },
      { date: '2026-10-01', kg: 70 },
      { date: '2026-10-11', kg: 69 },
    ])!;
    expect(g.points.map((p) => p.date)).toEqual(['2026-10-01', '2026-10-11', '2026-10-31']);
    expect(g.points.map((p) => p.x)).toEqual([0, 1 / 3, 1]);
  });

  it('pads the y range and puts heavier weights higher', () => {
    const g = chartGeometry([
      { date: '2026-10-01', kg: 70 },
      { date: '2026-10-02', kg: 60 },
    ])!;
    expect(g.min).toBeLessThan(60);
    expect(g.max).toBeGreaterThan(70);
    expect(g.points[0]!.y).toBeLessThan(g.points[1]!.y);
    expect(g.ticks[0]).toBe(g.min);
  });
});

describe('weightChange', () => {
  it('is last minus first, by date', () => {
    expect(weightChange([{ date: '2026-10-05', kg: 68.2 }, { date: '2026-10-01', kg: 70 }])).toBe(-1.8);
    expect(weightChange([{ date: '2026-10-01', kg: 70 }])).toBeNull();
  });
});
