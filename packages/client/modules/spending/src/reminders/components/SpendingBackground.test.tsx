import type { Bill, NotificationRule, SpendingReport } from '@alavo-daily/common/engine';
import type { ScheduledNotification } from '@alavo-daily/common';
import { createFakePlatform, renderWithProviders } from '@alavo-daily/common/testing';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SpendingBackground } from './SpendingBackground';

const NOW = new Date(2026, 9, 9, 8, 0);
const at = (day: number, hours: number, minutes = 0) => new Date(2026, 9, day, hours, minutes).getTime();

function rule(id: string, overrides: Partial<NotificationRule> = {}): NotificationRule {
  return { id, module: 'spending', label: id, description: '', kind: 'time', time: '09:00', enabled: true, ...overrides };
}

const billRule = (overrides: Partial<NotificationRule> = {}) => rule('spending.bill_reminder', overrides);
const weeklyRule = (overrides: Partial<NotificationRule> = {}) => rule('spending.weekly_summary', { time: '20:00', ...overrides });

const bills: Bill[] = [
  { id: 'b1', title: 'Thẻ tín dụng Techcombank', icon: 'wallet', amountVnd: 2_340_000, dayOfMonth: 12, active: true },
  { id: 'b2', title: 'Internet FPT', icon: 'lightning', amountVnd: 230_000, dayOfMonth: 15, active: true },
  { id: 'b3', title: 'Netflix', icon: 'film-strip', amountVnd: 260_000, dayOfMonth: 18, active: false },
];

function weekReport(from: string, to: string): SpendingReport {
  const spent = from === '2026-10-05';
  return {
    from,
    to,
    incomeVnd: 0,
    expenseVnd: spent ? 1_000_000 : 0,
    netVnd: spent ? -1_000_000 : 0,
    transactionCount: spent ? 4 : 0,
    categories: spent
      ? [{ categoryId: 'category-food', name: 'Ăn uống', icon: 'fork-knife', kind: 'expense', totalVnd: 900_000, share: 0.9, transactionCount: 3 }]
      : [],
    months: [],
  };
}

interface Options {
  rules?: NotificationRule[];
  bills?: Bill[];
}

function renderBackground({ rules = [billRule(), weeklyRule()], bills: billList = bills }: Options = {}) {
  const scheduled: ScheduledNotification[][] = [];
  const platform = createFakePlatform({ scheduleNotifications: async (items) => void scheduled.push(items) });
  const result = renderWithProviders(<SpendingBackground />, {
    platform,
    handlers: {
      'hub.list_notification_rules': () => rules,
      'spending.list_bills': () => billList,
      'spending.report': ({ from, to }) => weekReport(from, to),
      'spending.generate_recurring': () => ({ created: 0 }),
    },
  });
  const lastSchedule = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    return scheduled[scheduled.length - 1] ?? [];
  };
  return { lastSchedule, ...result };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => vi.useRealTimers());

describe('recurring transactions', () => {
  it('asks the engine to create the due ones once when the app opens', async () => {
    const { engine, lastSchedule } = renderBackground();
    await lastSchedule();
    expect(engine.callsTo('spending.generate_recurring')).toEqual([{ today: '2026-10-09' }]);
  });

  it('asks again when the day changes while the app stays open', async () => {
    const { engine, lastSchedule } = renderBackground();
    await lastSchedule();
    vi.setSystemTime(new Date(2026, 9, 10, 0, 5));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await lastSchedule();
    expect(engine.callsTo('spending.generate_recurring')).toEqual([{ today: '2026-10-09' }, { today: '2026-10-10' }]);
  });
});

describe('bill reminders', () => {
  it('reminds two days before each active bill at the rule time', async () => {
    const { lastSchedule } = renderBackground({ rules: [billRule()] });
    const items = await lastSchedule();
    expect(items.map((item) => item.at)).toEqual([at(10, 9), at(13, 9)]);
    expect(items[0]).toMatchObject({
      title: 'Hoá đơn sắp đến hạn',
      body: 'Thẻ tín dụng Techcombank sắp đến hạn: 2.340.000 ₫ vào 12/10',
    });
    expect(items[1]?.body).toBe('Internet FPT sắp đến hạn: 230.000 ₫ vào 15/10');
  });

  it('follows the time chosen in the settings', async () => {
    const { lastSchedule } = renderBackground({ rules: [billRule({ time: '07:30' })] });
    const items = await lastSchedule();
    expect(items[0]?.at).toBe(at(10, 7, 30));
  });

  it('clears them when the rule is switched off', async () => {
    const { lastSchedule } = renderBackground({ rules: [billRule({ enabled: false })] });
    expect(await lastSchedule()).toEqual([]);
  });

  it('clears them when the rule does not exist', async () => {
    const { lastSchedule } = renderBackground({ rules: [] });
    expect(await lastSchedule()).toEqual([]);
  });

  it('schedules nothing for a rule without a valid time', async () => {
    const { lastSchedule } = renderBackground({ rules: [billRule({ time: null })] });
    expect(await lastSchedule()).toEqual([]);
  });

  it('leaves out paused bills', async () => {
    const { lastSchedule } = renderBackground({ rules: [billRule()], bills: [bills[2]!] });
    expect(await lastSchedule()).toEqual([]);
  });
});

describe('weekly summary', () => {
  it('asks for the Monday to Sunday week of each of the next two Sundays', async () => {
    const { engine, lastSchedule } = renderBackground({ rules: [weeklyRule()] });
    await lastSchedule();
    const calls = engine.callsTo('spending.report');
    expect(calls).toContainEqual({ from: '2026-10-05', to: '2026-10-11' });
    expect(calls).toContainEqual({ from: '2026-10-12', to: '2026-10-18' });
  });

  it('sends the total and the top category on Sunday evening', async () => {
    const { lastSchedule } = renderBackground({ rules: [weeklyRule()] });
    const items = await lastSchedule();
    expect(items.map((item) => item.at)).toEqual([at(11, 20), at(18, 20)]);
    expect(items[0]).toMatchObject({
      title: 'Tóm tắt chi tiêu tuần này',
      body: 'Tuần này bạn chi 1.000.000 ₫, nhiều nhất là Ăn uống (900.000 ₫).',
    });
  });

  it('says so when a week has no spending yet', async () => {
    const { lastSchedule } = renderBackground({ rules: [weeklyRule()] });
    const items = await lastSchedule();
    expect(items[1]?.body).toBe('Tuần này bạn chưa ghi khoản chi nào.');
  });

  it('follows the time chosen in the settings', async () => {
    const { lastSchedule } = renderBackground({ rules: [weeklyRule({ time: '18:45' })] });
    const items = await lastSchedule();
    expect(items[0]?.at).toBe(at(11, 18, 45));
  });

  it('clears the schedule when the rule is switched off', async () => {
    const { lastSchedule } = renderBackground({ rules: [weeklyRule({ enabled: false })] });
    expect(await lastSchedule()).toEqual([]);
  });
});

describe('both reminders together', () => {
  it('are merged into one schedule in time order', async () => {
    const { lastSchedule } = renderBackground();
    const items = await lastSchedule();
    expect(items.map((item) => item.at)).toEqual([at(10, 9), at(11, 20), at(13, 9), at(18, 20)]);
    expect(new Set(items.map((item) => item.id)).size).toBe(4);
  });

  it('keep one when the other rule is off', async () => {
    const { lastSchedule } = renderBackground({ rules: [billRule(), weeklyRule({ enabled: false })] });
    expect((await lastSchedule()).map((item) => item.at)).toEqual([at(10, 9), at(13, 9)]);
  });
});
