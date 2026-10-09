import { notificationId, type ScheduledNotification } from '@alavo-daily/common';
import type { CategoryShare, SpendingReport } from '@alavo-daily/common/engine';
import { addDays, parseDateText, startOfWeek } from '@alavo-daily/common/format';

import { atLocalTime } from './localTime';
import type { ReminderText } from './billReminders';

export const WEEKLY_SUMMARY_RULE_ID = 'spending.weekly_summary';
export const SUNDAYS_AHEAD = 2;
const SUNDAY = 0;
const SEARCH_DAYS = 15;

export interface WeeklySummaryInput {
  /** The Sundays to remind on, oldest first, one report per Sunday in the same order. */
  sundays: readonly string[];
  reports: readonly SpendingReport[];
  time: string;
  now: number;
  describe: (report: SpendingReport) => ReminderText;
}

/** The next Sundays whose reminder time is still ahead. */
export function upcomingSundays(today: string, time: string, now: number, count: number): string[] {
  const days = Array.from({ length: SEARCH_DAYS }, (_, offset) => addDays(today, offset));
  const ahead = days.filter((day) => isSunday(day) && (atLocalTime(day, time) ?? -Infinity) > now);
  return ahead.slice(0, count);
}

/** Monday to Sunday of the week that ends on `sunday`. */
export function weekEndingOn(sunday: string): { from: string; to: string } {
  return { from: startOfWeek(sunday), to: sunday };
}

export function topExpenseCategory(report: SpendingReport): CategoryShare | null {
  return report.categories.find((item) => item.kind === 'expense') ?? null;
}

export function weeklyReminderId(sunday: string): number {
  return notificationId(`spending:weekly:${sunday}`);
}

export function buildWeeklyReminders({
  sundays,
  reports,
  time,
  now,
  describe,
}: WeeklySummaryInput): ScheduledNotification[] {
  return sundays.flatMap((sunday, index) => {
    const report = reports[index];
    const at = atLocalTime(sunday, time);
    if (!report || at === null || at <= now) return [];
    return [{ id: weeklyReminderId(sunday), at, ...describe(report) }];
  });
}

function isSunday(day: string): boolean {
  return parseDateText(day).getDay() === SUNDAY;
}
