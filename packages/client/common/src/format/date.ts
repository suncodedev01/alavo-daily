const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const WEEKDAYS_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** A local calendar date as `YYYY-MM-DD`. The engine never reads a timezone, so callers do. */
export function toDateText(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseDateText(text: string): Date {
  const [year = 0, month = 1, day = 1] = text.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function monthOf(dateText: string): string {
  return dateText.slice(0, 7);
}

export function addDays(dateText: string, days: number): string {
  const date = parseDateText(dateText);
  date.setDate(date.getDate() + days);
  return toDateText(date);
}

export function addMonths(month: string, delta: number): string {
  const [year = 0, number = 1] = month.split('-').map(Number);
  const date = new Date(year, number - 1 + delta, 1);
  return toDateText(date).slice(0, 7);
}

/** Monday of the week containing `dateText`. */
export function startOfWeek(dateText: string): string {
  const date = parseDateText(dateText);
  const sinceMonday = (date.getDay() + 6) % 7;
  return addDays(dateText, -sinceMonday);
}

export function weekdayName(dateText: string): string {
  return WEEKDAYS[parseDateText(dateText).getDay()] ?? '';
}

export function weekdayShort(dateText: string): string {
  return WEEKDAYS_SHORT[parseDateText(dateText).getDay()] ?? '';
}

/** `2026-10-09` → `9/10`. */
export function dayAndMonth(dateText: string): string {
  const [, month = '', day = ''] = dateText.split('-');
  return `${Number(day)}/${Number(month)}`;
}

/** `2026-10` → `Tháng 10, 2026`. */
export function monthTitle(month: string): string {
  const [year, number] = month.split('-');
  return `Tháng ${Number(number)}, ${year}`;
}

/** `Hôm nay · 9/10`, `Hôm qua · 8/10`, otherwise `Thứ Tư · 7/10`. */
export function relativeDayLabel(dateText: string, today: string): string {
  const prefix =
    dateText === today ? 'Hôm nay' : dateText === addDays(today, -1) ? 'Hôm qua' : weekdayName(dateText);
  return `${prefix} · ${dayAndMonth(dateText)}`;
}

export function daysInMonth(month: string): number {
  const [year = 0, number = 1] = month.split('-').map(Number);
  return new Date(year, number, 0).getDate();
}
