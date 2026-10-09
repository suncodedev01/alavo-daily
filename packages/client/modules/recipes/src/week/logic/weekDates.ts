import { addDays, dayAndMonth, parseDateText, startOfWeek, toDateText } from '@alavo-daily/common/format';

import { PLAN_DAYS } from '../../vocabulary';

const DATE_TEXT = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeWeek(param: string | null, today: string): string {
  const valid = param !== null && DATE_TEXT.test(param) && toDateText(parseDateText(param)) === param;
  return startOfWeek(valid ? param : today);
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: PLAN_DAYS }, (_, offset) => addDays(weekStart, offset));
}

export function weekRangeText(weekStart: string): string {
  const last = addDays(weekStart, PLAN_DAYS - 1);
  const [, firstMonth = '', firstDay = ''] = weekStart.split('-');
  const [, lastMonth = '', lastDay = ''] = last.split('-');
  if (firstMonth === lastMonth) return `${Number(firstDay)} – ${Number(lastDay)} tháng ${Number(lastMonth)}`;
  return `${dayAndMonth(weekStart)} – ${dayAndMonth(last)}`;
}

export function dayOfMonth(date: string): number {
  return Number(date.slice(8));
}
