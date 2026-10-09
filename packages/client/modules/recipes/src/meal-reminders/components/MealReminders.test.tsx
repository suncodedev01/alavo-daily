import type { NotificationRule, ScheduledNotification } from '@alavo-daily/common';
import { createFakePlatform, renderWithProviders } from '@alavo-daily/common/testing';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RecipesBackend } from '../../testing/fakeBackend';
import { MealReminders } from './MealReminders';

const NOW = new Date(2026, 9, 9, 12, 0);

function rule(id: string, time: string, enabled = true): NotificationRule {
  return { id, module: 'recipes', label: id, description: '', kind: 'time', time, enabled };
}

const DEFAULT_RULES = [
  rule('recipes.cook_reminder', '17:30'),
  rule('recipes.shop_reminder', '16:00'),
  rule('recipes.defrost_reminder', '21:00'),
];

function plannedBackend() {
  const backend = new RecipesBackend();
  backend.seedPlan('2026-10-10', 'dinner', 'ga-kho');
  return backend;
}

function renderReminders(rules: NotificationRule[], backend = plannedBackend()) {
  const scheduled: ScheduledNotification[][] = [];
  const platform = createFakePlatform({
    scheduleNotifications: async (items) => void scheduled.push(items),
  });
  const result = renderWithProviders(<MealReminders />, {
    platform,
    handlers: { ...backend.handlers(), 'hub.list_notification_rules': () => rules },
  });
  const lastSchedule = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    return scheduled[scheduled.length - 1] ?? [];
  };
  return { backend, lastSchedule, ...result };
}

const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).getTime();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => vi.useRealTimers());

describe('MealReminders', () => {
  it('schedules the defrost, shop and cook reminders for the planned dinner, in time order', async () => {
    const { lastSchedule } = renderReminders(DEFAULT_RULES);
    const items = await lastSchedule();
    expect(items.map((item) => [item.at, item.body])).toEqual([
      [at(9, 21), 'Mai nấu Gà kho gừng: nhớ lấy thịt ra rã đông'],
      [at(10, 16), 'Tuần này còn 2 nguyên liệu chưa mua, ước tính 29.000 ₫'],
      [at(10, 16, 35), 'Đến giờ nấu Gà kho gừng (55 phút)'],
    ]);
  });

  it('asks for the plan of eight days and the shopping lists it needs, starting today', async () => {
    const { engine, lastSchedule } = renderReminders(DEFAULT_RULES);
    await lastSchedule();
    expect(engine.callsTo('recipes.get_plan')).toContainEqual({ from: '2026-10-09', days: 8 });
    expect(engine.callsTo('recipes.get_shopping_list')).toContainEqual({ from: '2026-10-10', to: '2026-10-16' });
  });

  it('follows the time of each rule', async () => {
    const { lastSchedule } = renderReminders([
      rule('recipes.cook_reminder', '19:00'),
      rule('recipes.shop_reminder', '10:00'),
      rule('recipes.defrost_reminder', '20:15'),
    ]);
    const items = await lastSchedule();
    expect(items.map((item) => item.at)).toEqual([at(9, 20, 15), at(10, 10), at(10, 18, 5)]);
  });

  it('leaves out only the reminder of a rule that is switched off', async () => {
    const { lastSchedule } = renderReminders([
      rule('recipes.cook_reminder', '17:30', false),
      rule('recipes.shop_reminder', '16:00'),
      rule('recipes.defrost_reminder', '21:00'),
    ]);
    const items = await lastSchedule();
    expect(items.map((item) => item.title)).toEqual(['Rã đông cho ngày mai', 'Đi chợ cho tuần mới']);
  });

  it('schedules nothing when the rules do not exist or are all off', async () => {
    expect(await renderReminders([]).lastSchedule()).toEqual([]);
    const off = DEFAULT_RULES.map((own) => ({ ...own, enabled: false }));
    expect(await renderReminders(off).lastSchedule()).toEqual([]);
  });

  it('does not remind about shopping when every ingredient is already bought', async () => {
    const backend = plannedBackend();
    backend.haveFlags.set('Đùi gà|g', true);
    backend.haveFlags.set('Gừng|g', true);
    const { lastSchedule } = renderReminders(DEFAULT_RULES, backend);
    const items = await lastSchedule();
    expect(items.map((item) => item.title)).toEqual(['Rã đông cho ngày mai', 'Đến giờ nấu bữa tối']);
  });

  it('does not mention defrosting for a dish without meat or fish', async () => {
    const backend = new RecipesBackend();
    backend.seedPlan('2026-10-10', 'dinner', 'rau-muong');
    const { lastSchedule } = renderReminders(DEFAULT_RULES, backend);
    const items = await lastSchedule();
    expect(items.some((item) => item.title === 'Rã đông cho ngày mai')).toBe(false);
    expect(items.find((item) => item.title === 'Đến giờ nấu bữa tối')?.body).toBe('Đến giờ nấu Rau muống xào tỏi (10 phút)');
  });

  it('schedules nothing for an empty plan', async () => {
    const { lastSchedule } = renderReminders(DEFAULT_RULES, new RecipesBackend());
    expect(await lastSchedule()).toEqual([]);
  });

  it('only calls the platform through the shared reminder provider with ids that stay the same', async () => {
    const first = await renderReminders(DEFAULT_RULES).lastSchedule();
    const second = await renderReminders(DEFAULT_RULES).lastSchedule();
    expect(second.map((item) => item.id)).toEqual(first.map((item) => item.id));
    expect(new Set(first.map((item) => item.id)).size).toBe(3);
  });
});
