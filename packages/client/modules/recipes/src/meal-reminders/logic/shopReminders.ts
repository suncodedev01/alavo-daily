import { notificationId, type ScheduledNotification } from '@alavo-daily/common';
import type { ShoppingList } from '@alavo-daily/common/engine';
import { addDays, formatVnd } from '@alavo-daily/common/format';

import type { Translate } from '../../engine-errors';
import { clockTimeBefore, REMINDER_DAYS, stillAhead } from './reminderTimes';

export const SHOP_RULE_ID = 'recipes.shop_reminder';

export interface ShopReminderInput {
  list: ShoppingList;
  saturday: string;
  /** When to remind, "HH:MM". */
  time: string;
  now: number;
  t: Translate;
}

/** The seven days from the Saturday on: what the person shops for that weekend. */
export function shoppingRangeFrom(saturday: string): { from: string; to: string } {
  return { from: saturday, to: addDays(saturday, REMINDER_DAYS - 1) };
}

/** A reminder on `saturday`, only while the list for the coming week still has items to buy. */
export function buildShopReminder(input: ShopReminderInput): ScheduledNotification[] {
  const { list, saturday, time, now, t } = input;
  const at = clockTimeBefore(saturday, time);
  if (at === null || list.neededCount <= 0) return [];
  const reminder = {
    id: notificationId(`shop:${saturday}`),
    at,
    title: t('Đi chợ cho tuần mới'),
    body: shopBody(list, t),
  };
  return stillAhead([reminder], now);
}

function shopBody(list: ShoppingList, t: Translate): string {
  const count = list.neededCount;
  if (list.neededCostVnd <= 0) return t('Tuần này còn {{count}} nguyên liệu chưa mua.', { count });
  return t('Tuần này còn {{count}} nguyên liệu chưa mua, ước tính {{cost}}', {
    count,
    cost: formatVnd(list.neededCostVnd),
  });
}
