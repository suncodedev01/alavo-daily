import { describe, expect, it } from 'vitest';

import { atLocalTime } from './localTime';

describe('atLocalTime', () => {
  it('reads the date and the clock in the local time zone', () => {
    expect(atLocalTime('2026-10-12', '09:30')).toBe(new Date(2026, 9, 12, 9, 30).getTime());
  });

  it.each(['9:00', '24:00', '09:60', 'sáng', ''])('rejects the time %j', (time) => {
    expect(atLocalTime('2026-10-12', time)).toBeNull();
  });

  it('rejects a date that is not YYYY-MM-DD', () => {
    expect(atLocalTime('12/10/2026', '09:00')).toBeNull();
  });
});
