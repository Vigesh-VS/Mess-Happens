import { describe, expect, it } from 'vitest';
import { formatMessDate } from './messDate';

describe('formatMessDate', () => {
  it('uses the mess timezone, not the device timezone', () => {
    // 20:00 UTC on Tuesday is already 01:30 Wednesday in India.
    const at = new Date('2026-10-20T20:00:00Z');
    expect(formatMessDate(at).weekday).toBe('Wednesday');
    expect(formatMessDate(at).date).toBe('21 October 2026');
    expect(formatMessDate(at, 'UTC').weekday).toBe('Tuesday');
  });
});
