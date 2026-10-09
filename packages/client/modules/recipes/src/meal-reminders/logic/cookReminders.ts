import { notificationId, type ScheduledNotification } from '@alavo-daily/common';
import type { PlanEntry, RecipeSummary } from '@alavo-daily/common/engine';
import { formatMinutes } from '@alavo-daily/common/format';

import type { Translate } from '../../engine-errors';
import { clockTimeBefore, stillAhead } from './reminderTimes';

export const COOK_RULE_ID = 'recipes.cook_reminder';

export interface CookReminderInput {
  entries: readonly PlanEntry[];
  recipes: readonly RecipeSummary[];
  /** When dinner should be on the table, "HH:MM". */
  dinnerTime: string;
  dates: readonly string[];
  now: number;
  t: Translate;
}

/**
 * One reminder for each dinner dish of `dates`, at the time the cooking has to start for the dish
 * to be ready at dinner time: dinner time minus its preparing and cooking minutes.
 */
export function buildCookReminders(input: CookReminderInput): ScheduledNotification[] {
  const dinners = input.entries.filter(
    (entry) => entry.slot === 'dinner' && input.dates.includes(entry.date),
  );
  const reminders = dinners.flatMap((entry) => cookReminderOf(entry, input));
  return stillAhead(reminders, input.now);
}

function cookReminderOf(entry: PlanEntry, input: CookReminderInput): ScheduledNotification[] {
  const recipe = input.recipes.find((own) => own.id === entry.recipeId);
  const minutes = recipe ? recipe.prepMin + recipe.cookMin : 0;
  const at = clockTimeBefore(entry.date, input.dinnerTime, minutes);
  if (at === null) return [];
  return [
    {
      id: notificationId(`cook:${entry.id}`),
      at,
      title: input.t('Đến giờ nấu bữa tối'),
      body: cookBody(entry.recipeName, minutes, input.t),
    },
  ];
}

function cookBody(name: string, minutes: number, t: Translate): string {
  if (minutes <= 0) return t('Đến giờ nấu {{name}}', { name });
  return t('Đến giờ nấu {{name}} ({{time}})', { name, time: formatMinutes(minutes) });
}
