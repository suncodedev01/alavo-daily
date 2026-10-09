import { describe, expect, it } from 'vitest';

import { dayOfMonth, normalizeWeek, weekDates, weekRangeText } from './weekDates';

describe('normalizeWeek', () => {
  it('uses the Monday of this week by default', () => {
    expect(normalizeWeek(null, '2026-10-09')).toBe('2026-10-05');
  });

  it('snaps any day of the week to its Monday', () => {
    expect(normalizeWeek('2026-10-14', '2026-10-09')).toBe('2026-10-12');
  });

  it('ignores a broken value', () => {
    expect(normalizeWeek('soon', '2026-10-09')).toBe('2026-10-05');
    expect(normalizeWeek('2026-13-45', '2026-10-09')).toBe('2026-10-05');
  });
});

describe('week text', () => {
  it('lists seven days from Monday', () => {
    const dates = weekDates('2026-10-05');
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe('2026-10-05');
    expect(dates[6]).toBe('2026-10-11');
  });

  it('writes a range inside one month', () => {
    expect(weekRangeText('2026-10-05')).toBe('5 – 11 tháng 10');
  });

  it('writes both months when the week crosses a month', () => {
    expect(weekRangeText('2026-09-28')).toBe('28/9 – 4/10');
  });

  it('reads the day number', () => {
    expect(dayOfMonth('2026-10-05')).toBe(5);
  });
});
