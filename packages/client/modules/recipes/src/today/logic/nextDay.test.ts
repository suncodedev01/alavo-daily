import { describe, expect, it } from 'vitest';

import { millisUntilNextDay } from './nextDay';

describe('millisUntilNextDay', () => {
  it('counts down to just after local midnight', () => {
    const elevenPm = new Date(2026, 9, 9, 23, 0, 0);
    expect(millisUntilNextDay(elevenPm)).toBe(60 * 60 * 1000 + 1000);
  });

  it('is a full day plus the settle time at midnight itself', () => {
    const midnight = new Date(2026, 9, 9, 0, 0, 0);
    expect(millisUntilNextDay(midnight)).toBe(24 * 60 * 60 * 1000 + 1000);
  });

  it('crosses a month and a year end', () => {
    const lastMoment = new Date(2026, 11, 31, 23, 59, 59);
    expect(millisUntilNextDay(lastMoment)).toBe(2000);
  });

  it('is always positive', () => {
    expect(millisUntilNextDay(new Date(2026, 9, 9, 23, 59, 59, 999))).toBeGreaterThan(0);
  });
});
