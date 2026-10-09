import type { ScheduledNotification } from '@alavo-daily/common';
import { describe, expect, it } from 'vitest';

import { clockTimeBefore, datesFrom, nextSaturday, REMINDER_DAYS, stillAhead } from './reminderTimes';

describe('datesFrom', () => {
  it('lists seven dates in a row by default, across a month end', () => {
    expect(datesFrom('2026-10-29')).toEqual([
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
    ]);
    expect(datesFrom('2026-10-29')).toHaveLength(REMINDER_DAYS);
  });

  it('lists as many as asked', () => {
    expect(datesFrom('2026-10-09', 2)).toEqual(['2026-10-09', '2026-10-10']);
  });
});

describe('nextSaturday', () => {
  it.each([
    ['2026-10-05', '2026-10-10'],
    ['2026-10-08', '2026-10-10'],
    ['2026-10-09', '2026-10-10'],
    ['2026-10-10', '2026-10-10'],
    ['2026-10-11', '2026-10-17'],
    ['2026-12-31', '2027-01-02'],
  ])('from %s the Saturday is %s', (from, expected) => {
    expect(nextSaturday(from)).toBe(expected);
  });
});

describe('clockTimeBefore', () => {
  it('is the local time of the date', () => {
    expect(clockTimeBefore('2026-10-10', '17:30')).toBe(new Date(2026, 9, 10, 17, 30).getTime());
  });

  it('moves back by the given minutes, across midnight too', () => {
    expect(clockTimeBefore('2026-10-10', '17:30', 55)).toBe(new Date(2026, 9, 10, 16, 35).getTime());
    expect(clockTimeBefore('2026-10-10', '00:10', 30)).toBe(new Date(2026, 9, 9, 23, 40).getTime());
  });

  it('is null for a time or a date that is not valid', () => {
    expect(clockTimeBefore('2026-10-10', '25:00')).toBeNull();
    expect(clockTimeBefore('2026-10-10', 'noon')).toBeNull();
    expect(clockTimeBefore('tomorrow', '17:30')).toBeNull();
  });
});

describe('stillAhead', () => {
  const reminder = (id: number, at: number): ScheduledNotification => ({ id, at, title: '', body: '' });

  it('keeps the reminders that are in the future, earliest first', () => {
    const list = [reminder(1, 300), reminder(2, 100), reminder(3, 200), reminder(4, 50)];
    expect(stillAhead(list, 100).map((own) => own.id)).toEqual([3, 1]);
  });

  it('drops a reminder due exactly now', () => {
    expect(stillAhead([reminder(1, 100)], 100)).toEqual([]);
  });
});
