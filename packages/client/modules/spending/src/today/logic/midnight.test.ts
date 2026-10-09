import { describe, expect, it } from 'vitest';

import { msUntilNextMidnight } from './midnight';

const HOUR = 60 * 60 * 1000;

describe('msUntilNextMidnight', () => {
  it('counts the time left in the local day plus one second of margin', () => {
    expect(msUntilNextMidnight(new Date(2026, 9, 9, 22, 0))).toBe(2 * HOUR + 1000);
  });

  it('is a whole day at local midnight', () => {
    expect(msUntilNextMidnight(new Date(2026, 9, 9, 0, 0))).toBe(24 * HOUR + 1000);
  });

  it('rolls over the end of a month and a year', () => {
    expect(msUntilNextMidnight(new Date(2026, 11, 31, 23, 0))).toBe(HOUR + 1000);
    expect(msUntilNextMidnight(new Date(2026, 1, 28, 12, 0))).toBe(12 * HOUR + 1000);
  });
});
