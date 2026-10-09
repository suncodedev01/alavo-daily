import type { MorningMenu, ScheduledNotification } from '@alavo-daily/common';

export const MORNING_MENU_RULE_ID = 'recipes.morning_menu';
export const REMINDERS_PER_MORNING = 4;
export const MORNINGS_AHEAD = 3;

const HOUR_MS = 60 * 60 * 1000;
const CLOCK_TIME = /^(\d{2}):(\d{2})$/;
const DATE_TEXT = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface MenuText {
  title: string;
  body: string;
}

export interface ReminderInput {
  menus: readonly MorningMenu[];
  startTime: string;
  now: number;
  describe: (menu: MorningMenu) => MenuText;
}

/** The local time of `date` at `time` ("HH:MM") in milliseconds, or null when either is not valid. */
export function localTimeOf(date: string, time: string): number | null {
  const clock = CLOCK_TIME.exec(time);
  const day = DATE_TEXT.exec(date);
  if (!clock || !day) return null;
  const [hours, minutes] = [Number(clock[1]), Number(clock[2])];
  if (hours > 23 || minutes > 59) return null;
  return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]), hours, minutes).getTime();
}

/** One id per date and reminder, so a later schedule replaces the same reminder. */
export function reminderId(date: string, index: number): number {
  return Number(date.replaceAll('-', '')) * 10 + index;
}

/**
 * Reminders for every morning that has something to say: at the start time, then once an hour
 * (6, 7, 8 and 9 o'clock for the default 06:00). Times that already passed are left out.
 */
export function buildReminders({ menus, startTime, now, describe }: ReminderInput): ScheduledNotification[] {
  return menus.flatMap((menu) => {
    const first = localTimeOf(menu.date, startTime);
    if (first === null || menu.source === 'empty') return [];
    const text = describe(menu);
    return Array.from({ length: REMINDERS_PER_MORNING }, (_, index) => ({
      id: reminderId(menu.date, index),
      at: first + index * HOUR_MS,
      ...text,
    })).filter((reminder) => reminder.at > now);
  });
}
