import { addDays, dayRange, parseDateText, startOfWeek, toDateText } from '@alavo-daily/common/format';
import type { Language } from '@alavo-daily/common';

import { PLAN_DAYS } from '../../vocabulary';

const DATE_TEXT = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeWeek(param: string | null, today: string): string {
  const valid = param !== null && DATE_TEXT.test(param) && toDateText(parseDateText(param)) === param;
  return startOfWeek(valid ? param : today);
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: PLAN_DAYS }, (_, offset) => addDays(weekStart, offset));
}

export function weekRangeText(weekStart: string, language: Language = 'vi'): string {
  return dayRange(weekStart, addDays(weekStart, PLAN_DAYS - 1), language);
}

export function dayOfMonth(date: string): number {
  return Number(date.slice(8));
}
