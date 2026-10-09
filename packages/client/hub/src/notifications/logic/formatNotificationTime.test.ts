import { describe, expect, it } from 'vitest';

import { formatTimeOfDay } from '../../clock';
import { formatNotificationTime } from './formatNotificationTime';

describe('notification time', () => {
  const at = (day: number, hour: number, minute: number) => new Date(2026, 9, day, hour, minute).getTime();

  it('pads hours and minutes', () => {
    expect(formatTimeOfDay(at(9, 7, 5))).toBe('07:05');
  });

  it('shows only the time for today', () => {
    expect(formatNotificationTime(at(9, 17, 30), '2026-10-09')).toBe('17:30');
  });

  it('says yesterday', () => {
    expect(formatNotificationTime(at(8, 16, 0), '2026-10-09')).toBe('Hôm qua · 16:00');
  });

  it('shows day and month for older ones', () => {
    expect(formatNotificationTime(at(7, 19, 40), '2026-10-09')).toBe('7/10 · 19:40');
  });
});
