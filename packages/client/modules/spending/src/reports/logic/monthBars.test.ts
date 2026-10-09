import type { MonthBar } from '@alavo-daily/common/engine';
import { describe, expect, it } from 'vitest';

import { BARS_HEIGHT, buildMonthBars, monthLabel } from './monthBars';

const bar = (month: string, incomeVnd: number, expenseVnd: number): MonthBar => ({
  month,
  incomeVnd,
  expenseVnd,
  netVnd: incomeVnd - expenseVnd,
});

function monthsOf(count: number, firstYear: number): MonthBar[] {
  return Array.from({ length: count }, (_, index) => {
    const year = firstYear + Math.floor(index / 12);
    return bar(`${year}-${String((index % 12) + 1).padStart(2, '0')}`, 1, 1);
  });
}

describe('monthLabel', () => {
  it('shortens a month to T plus its number', () => {
    expect(monthLabel('2026-10', false)).toBe('T10');
  });

  it('adds the year when the range spans several', () => {
    expect(monthLabel('2026-01', true)).toBe('1/26');
  });
});

describe('buildMonthBars', () => {
  const model = buildMonthBars([bar('2026-08', 0, 1_000_000), bar('2026-09', 2_000_000, 500_000)]);

  it('makes one group per month in order', () => {
    expect(model.groups.map((group) => group.month)).toEqual(['2026-08', '2026-09']);
  });

  it('scales the tallest value to the top grid line and draws an empty month as a flat bar', () => {
    const [august, september] = model.groups;
    expect(september?.income.height).toBeGreaterThan(august?.expense.height ?? 0);
    expect(august?.income.height).toBe(0);
    expect(august?.income.y).toBe(model.baselineY);
    expect(model.grid[4]?.valueVnd).toBe(2_000_000);
  });

  it('puts the income bar right beside the expense bar of the same month', () => {
    const group = model.groups[0];
    expect((group?.expense.x ?? 0) + (group?.expense.width ?? 0)).toBeCloseTo(group?.income.x ?? -1);
  });

  it('keeps every bar inside the chart', () => {
    for (const group of model.groups) {
      expect(group.expense.y + group.expense.height).toBeLessThanOrEqual(BARS_HEIGHT);
    }
  });

  it('labels every month up to a year and thins the labels beyond it', () => {
    expect(buildMonthBars(monthsOf(12, 2026)).groups.every((group) => group.showLabel)).toBe(true);
    const shown = buildMonthBars(monthsOf(36, 2024)).groups.filter((group) => group.showLabel).length;
    expect(shown).toBeLessThanOrEqual(12);
  });

  it('writes the year into the labels of a range that spans two years', () => {
    expect(buildMonthBars(monthsOf(14, 2025)).groups[0]?.label).toBe('1/25');
  });

  it('copes with an empty series', () => {
    expect(buildMonthBars([]).groups).toEqual([]);
  });
});
