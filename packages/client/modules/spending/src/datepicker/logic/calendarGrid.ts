import { addDays, daysInMonth, monthOf, parseDateText, toDateText } from '@alavo-daily/common/format';

export const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

const DAYS_PER_WEEK = 7;

function mondayFirstOffset(month: string): number {
  const firstDay = parseDateText(`${month}-01`).getDay();
  return (firstDay + 6) % DAYS_PER_WEEK;
}

export function monthGrid(month: string): (string | null)[][] {
  const cells: (string | null)[] = Array.from({ length: mondayFirstOffset(month) }, () => null);
  for (let day = 1; day <= daysInMonth(month); day += 1) {
    cells.push(`${month}-${String(day).padStart(2, '0')}`);
  }
  while (cells.length % DAYS_PER_WEEK !== 0) cells.push(null);
  return Array.from({ length: cells.length / DAYS_PER_WEEK }, (_, week) =>
    cells.slice(week * DAYS_PER_WEEK, (week + 1) * DAYS_PER_WEEK),
  );
}

export function shiftMonthKeepingDay(date: string, delta: number): string {
  const source = parseDateText(date);
  const target = new Date(source.getFullYear(), source.getMonth() + delta, 1);
  const lastDay = daysInMonth(monthOf(toDateText(target)));
  target.setDate(Math.min(source.getDate(), lastDay));
  return toDateText(target);
}

export function weekdayIndex(date: string): number {
  return (parseDateText(date).getDay() + 6) % DAYS_PER_WEEK;
}

const KEY_MOVES: Record<string, (date: string) => string> = {
  ArrowLeft: (date) => addDays(date, -1),
  ArrowRight: (date) => addDays(date, 1),
  ArrowUp: (date) => addDays(date, -DAYS_PER_WEEK),
  ArrowDown: (date) => addDays(date, DAYS_PER_WEEK),
  Home: (date) => addDays(date, -weekdayIndex(date)),
  End: (date) => addDays(date, DAYS_PER_WEEK - 1 - weekdayIndex(date)),
  PageUp: (date) => shiftMonthKeepingDay(date, -1),
  PageDown: (date) => shiftMonthKeepingDay(date, 1),
};

export function moveByKey(date: string, key: string): string | null {
  return KEY_MOVES[key]?.(date) ?? null;
}

export function isValidDateText(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  return toDateText(parseDateText(text)) === text;
}
