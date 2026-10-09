import type { ShoppingList } from '@alavo-daily/common/engine';
import { describe, expect, it } from 'vitest';

import { plainTranslate } from '../../testing/plainTranslate';
import { buildShopReminder, shoppingRangeFrom, type ShopReminderInput } from './shopReminders';

const NOW = new Date(2026, 9, 9, 12, 0).getTime();

function list(neededCount: number, neededCostVnd: number): ShoppingList {
  return { from: '2026-10-10', to: '2026-10-16', items: [], neededCount, neededCostVnd };
}

function input(overrides: Partial<ShopReminderInput> = {}): ShopReminderInput {
  return {
    list: list(5, 187_000),
    saturday: '2026-10-10',
    time: '16:00',
    now: NOW,
    t: plainTranslate,
    ...overrides,
  };
}

describe('shoppingRangeFrom', () => {
  it('covers the seven days from the Saturday', () => {
    expect(shoppingRangeFrom('2026-10-10')).toEqual({ from: '2026-10-10', to: '2026-10-16' });
    expect(shoppingRangeFrom('2026-12-26')).toEqual({ from: '2026-12-26', to: '2027-01-01' });
  });
});

describe('buildShopReminder', () => {
  it('reminds on Saturday at the rule time with what is left and its estimated cost', () => {
    const [reminder] = buildShopReminder(input());
    expect(reminder?.at).toBe(new Date(2026, 9, 10, 16, 0).getTime());
    expect(reminder?.body).toBe('Tuần này còn 5 nguyên liệu chưa mua, ước tính 187.000 ₫');
    expect(reminder?.title).toBe('Đi chợ cho tuần mới');
  });

  it('follows the time of the rule', () => {
    expect(buildShopReminder(input({ time: '09:15' }))[0]?.at).toBe(new Date(2026, 9, 10, 9, 15).getTime());
  });

  it('says nothing when everything is already bought', () => {
    expect(buildShopReminder(input({ list: list(0, 0) }))).toEqual([]);
  });

  it('leaves the estimate out when no ingredient has a price', () => {
    const [reminder] = buildShopReminder(input({ list: list(3, 0) }));
    expect(reminder?.body).toBe('Tuần này còn 3 nguyên liệu chưa mua.');
  });

  it('says nothing once the time has passed', () => {
    const late = new Date(2026, 9, 10, 16, 1).getTime();
    expect(buildShopReminder(input({ now: late }))).toEqual([]);
  });

  it('gives nothing for an invalid time', () => {
    expect(buildShopReminder(input({ time: '' }))).toEqual([]);
  });

  it('has one id per Saturday', () => {
    const first = buildShopReminder(input())[0]?.id;
    const next = buildShopReminder(input({ saturday: '2026-10-17' }))[0]?.id;
    expect(first).toBe(buildShopReminder(input())[0]?.id);
    expect(first).not.toBe(next);
  });
});
