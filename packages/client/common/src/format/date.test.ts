import { describe, expect, it } from 'vitest';

import {
  addDays,
  addMonths,
  dayAndMonth,
  daysInMonth,
  monthOf,
  monthTitle,
  relativeDayLabel,
  startOfWeek,
  toDateText,
  weekdayName,
  weekdayShort,
} from './date';

describe('date text', () => {
  it('formats a local date as YYYY-MM-DD with padding', () => {
    expect(toDateText(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('extracts the month', () => {
    expect(monthOf('2026-10-09')).toBe('2026-10');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('adds months and wraps the year', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('counts the days of a month including leap years', () => {
    expect(daysInMonth('2024-02')).toBe(29);
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2026-10')).toBe(31);
  });
});

describe('weeks', () => {
  it('starts the week on Monday', () => {
    expect(startOfWeek('2026-10-09')).toBe('2026-10-05');
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05');
    expect(startOfWeek('2026-10-05')).toBe('2026-10-05');
  });

  it('names weekdays in Vietnamese', () => {
    expect(weekdayName('2026-10-09')).toBe('Thứ Sáu');
    expect(weekdayName('2026-10-11')).toBe('Chủ Nhật');
    expect(weekdayShort('2026-10-05')).toBe('T2');
  });
});

describe('labels', () => {
  it('writes day and month without leading zeros', () => {
    expect(dayAndMonth('2026-10-09')).toBe('9/10');
  });

  it('titles a month', () => {
    expect(monthTitle('2026-10')).toBe('Tháng 10, 2026');
  });

  it('says today and yesterday, and otherwise the weekday', () => {
    expect(relativeDayLabel('2026-10-09', '2026-10-09')).toBe('Hôm nay · 9/10');
    expect(relativeDayLabel('2026-10-08', '2026-10-09')).toBe('Hôm qua · 8/10');
    expect(relativeDayLabel('2026-10-07', '2026-10-09')).toBe('Thứ Tư · 7/10');
  });
});
