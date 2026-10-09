import type { NotificationActionEvent, ScheduledNotification } from '@alavo-daily/common';
import { describe, expect, it } from 'vitest';

import { dropExpired, nextExpiry, snoozedCopy, withSnooze } from './snooze';

const NOW = new Date(2026, 9, 9, 6, 0).getTime();
const TEN_MINUTES = 10 * 60 * 1000;

function press(overrides: Partial<NotificationActionEvent> = {}): NotificationActionEvent {
  return {
    actionId: 'snooze-10',
    actionTypeId: 'dish-reminder',
    notificationId: 5,
    title: 'Hôm nay ăn gì?',
    body: 'Bún chả',
    data: { recipeId: 'recipe-1' },
    ...overrides,
  };
}

describe('snoozedCopy', () => {
  it('repeats the notification 10 minutes from now with its buttons and data', () => {
    expect(snoozedCopy(press(), NOW)).toMatchObject({
      at: NOW + TEN_MINUTES,
      title: 'Hôm nay ăn gì?',
      body: 'Bún chả',
      actionTypeId: 'dish-reminder',
      data: { recipeId: 'recipe-1' },
    });
  });

  it('leaves out the buttons and data the notification did not have', () => {
    const copy = snoozedCopy(press({ actionTypeId: null, data: {} }), NOW);
    expect(copy).not.toHaveProperty('actionTypeId');
    expect(copy).not.toHaveProperty('data');
  });

  it('gives nothing back when the system did not say what the notification was', () => {
    expect(snoozedCopy(press({ title: '', body: '' }), NOW)).toBeNull();
  });

  it('uses the same id for the same notification and another id for another', () => {
    expect(snoozedCopy(press(), NOW)?.id).toBe(snoozedCopy(press(), NOW + 1)?.id);
    expect(snoozedCopy(press({ notificationId: 6 }), NOW)?.id).not.toBe(snoozedCopy(press(), NOW)?.id);
  });
});

describe('withSnooze', () => {
  const old = (at: number): ScheduledNotification => ({ id: at, at, title: 'cũ', body: '' });

  it('adds the copy and forgets reminders whose time has passed', () => {
    const result = withSnooze([old(NOW - 1), old(NOW + 5)], press(), NOW);
    expect(result.map((item) => item.title)).toEqual(['cũ', 'Hôm nay ăn gì?']);
    expect(result[0]?.at).toBe(NOW + 5);
  });

  it('replaces an earlier snooze of the same notification instead of doubling it', () => {
    const once = withSnooze([], press(), NOW);
    expect(withSnooze(once, press(), NOW + 60_000)).toHaveLength(1);
  });

  it('returns the list unchanged when there is nothing to repeat', () => {
    const current = [old(NOW + 5)];
    expect(withSnooze(current, press({ title: '' }), NOW)).toBe(current);
  });
});

describe('dropExpired and nextExpiry', () => {
  it('keeps only reminders in the future and returns the same list when none expired', () => {
    const items = [{ id: 1, at: NOW + 1, title: 'a', body: '' }];
    expect(dropExpired(items, NOW)).toBe(items);
    expect(dropExpired(items, NOW + 1)).toEqual([]);
  });

  it('finds the earliest time, or null for an empty list', () => {
    expect(nextExpiry([])).toBeNull();
    const items = [3, 1, 2].map((at) => ({ id: at, at, title: '', body: '' }));
    expect(nextExpiry(items)).toBe(1);
  });
});
