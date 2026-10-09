import { describe, expect, it } from 'vitest';

import { isValidDateText, monthGrid, moveByKey, shiftMonthKeepingDay, weekdayIndex } from './calendarGrid';

describe('monthGrid', () => {
  it('starts weeks on Monday and pads with blanks', () => {
    const weeks = monthGrid('2026-10');
    expect(weeks[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it('contains every day of the month exactly once', () => {
    const days = monthGrid('2026-02').flat().filter((cell) => cell !== null);
    expect(days).toHaveLength(28);
    expect(days.at(-1)).toBe('2026-02-28');
  });

  it('has four rows for a Monday-starting February and six when a month spills over', () => {
    expect(monthGrid('2027-02')).toHaveLength(4);
    expect(monthGrid('2026-02')).toHaveLength(5);
    expect(monthGrid('2026-08')).toHaveLength(6);
  });
});

describe('shiftMonthKeepingDay', () => {
  it('keeps the day when the target month is long enough', () => {
    expect(shiftMonthKeepingDay('2026-10-09', 1)).toBe('2026-11-09');
  });

  it('clamps to the last day of a shorter month', () => {
    expect(shiftMonthKeepingDay('2026-01-31', 1)).toBe('2026-02-28');
  });

  it('crosses year boundaries in both directions', () => {
    expect(shiftMonthKeepingDay('2026-01-15', -1)).toBe('2025-12-15');
    expect(shiftMonthKeepingDay('2026-12-15', 1)).toBe('2027-01-15');
  });
});

describe('moveByKey', () => {
  it('moves by a day with left and right arrows', () => {
    expect(moveByKey('2026-10-09', 'ArrowLeft')).toBe('2026-10-08');
    expect(moveByKey('2026-10-31', 'ArrowRight')).toBe('2026-11-01');
  });

  it('moves by a week with up and down arrows', () => {
    expect(moveByKey('2026-10-09', 'ArrowUp')).toBe('2026-10-02');
    expect(moveByKey('2026-10-09', 'ArrowDown')).toBe('2026-10-16');
  });

  it('jumps to the start and end of the week with Home and End', () => {
    expect(moveByKey('2026-10-09', 'Home')).toBe('2026-10-05');
    expect(moveByKey('2026-10-09', 'End')).toBe('2026-10-11');
  });

  it('jumps a month with Page Up and Page Down', () => {
    expect(moveByKey('2026-10-09', 'PageUp')).toBe('2026-09-09');
    expect(moveByKey('2026-10-09', 'PageDown')).toBe('2026-11-09');
  });

  it('ignores other keys', () => {
    expect(moveByKey('2026-10-09', 'a')).toBeNull();
  });
});

describe('weekdayIndex and isValidDateText', () => {
  it('counts Monday as 0 and Sunday as 6', () => {
    expect(weekdayIndex('2026-10-05')).toBe(0);
    expect(weekdayIndex('2026-10-11')).toBe(6);
  });

  it('accepts real dates and rejects impossible ones', () => {
    expect(isValidDateText('2026-02-28')).toBe(true);
    expect(isValidDateText('2026-02-30')).toBe(false);
    expect(isValidDateText('2026-2-3')).toBe(false);
    expect(isValidDateText('')).toBe(false);
  });
});
