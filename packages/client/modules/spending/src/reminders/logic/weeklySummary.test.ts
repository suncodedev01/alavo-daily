import type { SpendingReport } from '@alavo-daily/common/engine';
import { describe, expect, it } from 'vitest';

import {
  buildWeeklyReminders,
  topExpenseCategory,
  upcomingSundays,
  weekEndingOn,
  weeklyReminderId,
} from './weeklySummary';

function report(expenseVnd: number, categories: SpendingReport['categories'] = []): SpendingReport {
  return {
    from: '2026-10-05',
    to: '2026-10-11',
    incomeVnd: 0,
    expenseVnd,
    netVnd: -expenseVnd,
    transactionCount: categories.length,
    categories,
    months: [],
  };
}

const food = { categoryId: 'category-food', name: 'Ăn uống', icon: 'fork-knife', kind: 'expense' as const, totalVnd: 900, share: 0.9, transactionCount: 3 };
const at = (day: number, hours = 20) => new Date(2026, 9, day, hours, 0).getTime();
const describeReport = (item: SpendingReport) => ({ title: 'Tóm tắt', body: String(item.expenseVnd) });

describe('upcomingSundays', () => {
  it('lists the next two Sundays after a weekday', () => {
    expect(upcomingSundays('2026-10-09', '20:00', at(9, 10), 2)).toEqual(['2026-10-11', '2026-10-18']);
  });

  it('includes today when today is Sunday and the time is still ahead', () => {
    expect(upcomingSundays('2026-10-11', '20:00', at(11, 10), 2)).toEqual(['2026-10-11', '2026-10-18']);
  });

  it('skips today when today is Sunday and the time has passed', () => {
    expect(upcomingSundays('2026-10-11', '20:00', at(11, 21), 2)).toEqual(['2026-10-18', '2026-10-25']);
  });

  it('gives nothing for an invalid time', () => {
    expect(upcomingSundays('2026-10-09', 'tối', 0, 2)).toEqual([]);
  });
});

describe('weekEndingOn', () => {
  it('runs from the Monday before to the Sunday', () => {
    expect(weekEndingOn('2026-10-11')).toEqual({ from: '2026-10-05', to: '2026-10-11' });
  });
});

describe('topExpenseCategory', () => {
  it('is the first expense category of the report', () => {
    const income = { ...food, categoryId: 'income', kind: 'income' as const, totalVnd: 5000 };
    expect(topExpenseCategory(report(900, [income, food]))?.categoryId).toBe('category-food');
  });

  it('is nothing for a week without spending', () => {
    expect(topExpenseCategory(report(0))).toBeNull();
  });
});

describe('buildWeeklyReminders', () => {
  const input = { sundays: ['2026-10-11', '2026-10-18'], time: '20:00', now: at(9, 10), describe: describeReport };

  it('makes one reminder per Sunday at the rule time with the text of its own week', () => {
    const reminders = buildWeeklyReminders({ ...input, reports: [report(900, [food]), report(0)] });
    expect(reminders.map((item) => [item.at, item.body])).toEqual([[at(11), '900'], [at(18), '0']]);
  });

  it('gives each Sunday its own stable id', () => {
    const reminders = buildWeeklyReminders({ ...input, reports: [report(1), report(2)] });
    expect(reminders[0]?.id).toBe(weeklyReminderId('2026-10-11'));
    expect(new Set(reminders.map((item) => item.id)).size).toBe(2);
  });

  it('leaves out a Sunday whose time has passed', () => {
    const reminders = buildWeeklyReminders({ ...input, now: at(11, 21), reports: [report(1), report(2)] });
    expect(reminders.map((item) => item.at)).toEqual([at(18)]);
  });

  it('leaves out a Sunday that has no report yet', () => {
    expect(buildWeeklyReminders({ ...input, reports: [report(1)] })).toHaveLength(1);
  });

  it('schedules nothing for an invalid time', () => {
    expect(buildWeeklyReminders({ ...input, time: '', reports: [report(1), report(2)] })).toEqual([]);
  });
});
