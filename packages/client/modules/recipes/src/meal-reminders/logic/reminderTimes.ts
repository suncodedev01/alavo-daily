import type { ScheduledNotification } from '@alavo-daily/common';
import { addDays, parseDateText } from '@alavo-daily/common/format';

import { localTimeOf } from '../../morning-menu';

export const REMINDER_DAYS = 7;

const SATURDAY = 6;
const MINUTE_MS = 60 * 1000;

/** `count` dates in a row starting at `from`. */
export function datesFrom(from: string, count: number = REMINDER_DAYS): string[] {
  return Array.from({ length: count }, (_, offset) => addDays(from, offset));
}

/** The first Saturday on or after `from`: one always falls inside any seven days. */
export function nextSaturday(from: string): string {
  const daysAway = (SATURDAY - parseDateText(from).getDay() + 7) % 7;
  return addDays(from, daysAway);
}

/** The local time of `date` at `time` ("HH:MM"), moved back by `minutes`. Null when `time` is not valid. */
export function clockTimeBefore(date: string, time: string, minutes = 0): number | null {
  const at = localTimeOf(date, time);
  return at === null ? null : at - minutes * MINUTE_MS;
}

/** Reminders whose time has not passed yet, earliest first. */
export function stillAhead(reminders: readonly ScheduledNotification[], now: number): ScheduledNotification[] {
  return reminders.filter((reminder) => reminder.at > now).sort((a, b) => a.at - b.at || a.id - b.id);
}
