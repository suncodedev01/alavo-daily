import type { MorningMenu, NotificationRule, ScheduledNotification } from '@alavo-daily/common';
import { createFakePlatform, renderWithProviders } from '@alavo-daily/common/testing';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MORNING_MENU_RULE_ID } from '../logic/reminders';
import { MorningMenuReminders } from './MorningMenuReminders';

const HOUR = 60 * 60 * 1000;
const NOW = new Date(2026, 9, 10, 5, 30);

function rule(overrides: Partial<NotificationRule> = {}): NotificationRule {
  return {
    id: MORNING_MENU_RULE_ID,
    module: 'recipes',
    label: 'Nhắc món hôm nay vào buổi sáng',
    description: '',
    kind: 'time',
    time: '06:00',
    enabled: true,
    ...overrides,
  };
}

const planned: MorningMenu = {
  date: '2026-10-10',
  source: 'planned',
  dishes: [{ recipeId: 'r1', name: 'Bún chả', icon: 'cooking-pot', slot: 'lunch' }],
};

function renderReminders(menus: MorningMenu[], rules: NotificationRule[]) {
  const scheduled: ScheduledNotification[][] = [];
  const platform = createFakePlatform({
    scheduleNotifications: async (items) => void scheduled.push(items),
  });
  const result = renderWithProviders(<MorningMenuReminders />, {
    platform,
    handlers: {
      'recipes.morning_menus': () => menus,
      'hub.list_notification_rules': () => rules,
    },
  });
  const lastSchedule = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
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

describe('MorningMenuReminders', () => {
  it('asks for the menus of the next three mornings starting today', async () => {
    const { engine, lastSchedule } = renderReminders([planned], [rule()]);
    await lastSchedule();
    const request = engine.calls.find((call) => call.command === 'recipes.morning_menus');
    expect(request?.payload).toEqual({ from: '2026-10-10', days: 3 });
  });

  it('schedules the four morning reminders with the dishes planned for the day', async () => {
    const { lastSchedule } = renderReminders([planned], [rule()]);
    const items = await lastSchedule();
    const first = new Date(2026, 9, 10, 6).getTime();
    expect(items.map((item) => item.at)).toEqual([0, 1, 2, 3].map((hour) => first + hour * HOUR));
    expect(items[0]).toMatchObject({
      title: 'Hôm nay ăn gì?',
      body: 'Hôm nay bạn ăn: Trưa: Bún chả. Nhớ mua nguyên liệu nhé.',
    });
  });

  it('pushes a suggested dish when nothing is planned', async () => {
    const suggested: MorningMenu = {
      date: '2026-10-10',
      source: 'suggested',
      dishes: [{ recipeId: 'r2', name: 'Canh chua', icon: 'cooking-pot', slot: null }],
    };
    const { lastSchedule } = renderReminders([suggested], [rule()]);
    const items = await lastSchedule();
    expect(items[0]?.body).toBe('Hôm nay bạn chưa chọn món. Thử Canh chua nhé?');
  });

  it('clears the schedule when the rule is switched off', async () => {
    const { lastSchedule } = renderReminders([planned], [rule({ enabled: false })]);
    expect(await lastSchedule()).toEqual([]);
  });

  it('clears the schedule when the rule does not exist', async () => {
    const { lastSchedule } = renderReminders([planned], []);
    expect(await lastSchedule()).toEqual([]);
  });

  it('follows the time chosen in the settings', async () => {
    const { lastSchedule } = renderReminders([planned], [rule({ time: '07:15' })]);
    const items = await lastSchedule();
    expect(items[0]?.at).toBe(new Date(2026, 9, 10, 7, 15).getTime());
  });

  it('schedules nothing for a morning with nothing to say', async () => {
    const empty: MorningMenu = { date: '2026-10-10', source: 'empty', dishes: [] };
    const { lastSchedule } = renderReminders([empty], [rule()]);
    expect(await lastSchedule()).toEqual([]);
  });
});

describe('MorningMenuReminders at midnight', () => {
  it('asks for the menus of the new day without any user action once midnight passes', async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(new Date(2026, 9, 10, 23, 30));
    const { engine } = renderReminders([planned], [rule()]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(engine.callsTo('recipes.morning_menus')).toEqual([{ from: '2026-10-10', days: 3 }]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31 * 60 * 1000);
    });
    expect(engine.callsTo('recipes.morning_menus')).toContainEqual({ from: '2026-10-11', days: 3 });
  });
});
