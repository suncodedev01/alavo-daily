import { notificationId, type ScheduledNotification } from '@alavo-daily/common';
import type { PlanEntry, ShoppingList } from '@alavo-daily/common/engine';
import { addDays } from '@alavo-daily/common/format';

import type { Translate } from '../../engine-errors';
import { clockTimeBefore, stillAhead } from './reminderTimes';

export const DEFROST_RULE_ID = 'recipes.defrost_reminder';

export interface DefrostReminderInput {
  entries: readonly PlanEntry[];
  /** Names of the dishes that need meat or fish, see `meatAndFishDishes`. */
  meatDishes: ReadonlySet<string>;
  /** The days the dishes are cooked on. Each is reminded the evening before. */
  cookDates: readonly string[];
  /** When to remind, "HH:MM". */
  time: string;
  now: number;
  t: Translate;
}

/** The recipes of a shopping list that need an ingredient from the meat and fish aisle. */
export function meatAndFishDishes(list: ShoppingList): Set<string> {
  const meat = list.items.filter((item) => item.aisle === 'meat_fish');
  return new Set(meat.flatMap((item) => item.from));
}

/** One reminder the evening before each day that has a dish with meat or fish planned. */
export function buildDefrostReminders(input: DefrostReminderInput): ScheduledNotification[] {
  const reminders = input.cookDates.flatMap((date) => defrostReminderOf(date, input));
  return stillAhead(reminders, input.now);
}

function defrostReminderOf(date: string, input: DefrostReminderInput): ScheduledNotification[] {
  const dishes = meatDishNamesOn(date, input);
  const at = clockTimeBefore(addDays(date, -1), input.time);
  if (dishes.length === 0 || at === null) return [];
  return [
    {
      id: notificationId(`defrost:${date}`),
      at,
      title: input.t('Rã đông cho ngày mai'),
      body: input.t('Mai nấu {{names}}: nhớ lấy thịt ra rã đông', { names: dishes.join(', ') }),
    },
  ];
}

function meatDishNamesOn(date: string, input: DefrostReminderInput): string[] {
  const names = input.entries
    .filter((entry) => entry.date === date && input.meatDishes.has(entry.recipeName))
    .map((entry) => entry.recipeName);
  return Array.from(new Set(names));
}
