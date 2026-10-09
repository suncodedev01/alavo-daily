import { DEFAULT_LANGUAGE, type Language } from '../i18n/language';
import { dateNamesOf } from './dateNames';

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

export function weekdayName(dateText: string, language: Language = DEFAULT_LANGUAGE): string {
  return dateNamesOf(language).weekdays[parseDateText(dateText).getDay()] ?? '';
}

export function weekdayShort(dateText: string, language: Language = DEFAULT_LANGUAGE): string {
  return dateNamesOf(language).weekdaysShort[parseDateText(dateText).getDay()] ?? '';
}

function monthNumberOf(dateText: string): number {
  return Number(dateText.split('-')[1]);
}

function dayNumberOf(dateText: string): number {
  return Number(dateText.split('-')[2]);
}

/** `2026-10-09` → `9/10`, in English `Oct 9`. */
export function dayAndMonth(dateText: string, language: Language = DEFAULT_LANGUAGE): string {
  if (language === 'en') {
    const month = dateNamesOf(language).monthsShort[monthNumberOf(dateText) - 1] ?? '';
    return `${month} ${dayNumberOf(dateText)}`;
  }
  return `${dayNumberOf(dateText)}/${monthNumberOf(dateText)}`;
}

/** `2026-10-09` → `Thứ Sáu, 9 tháng 10`, in English `Friday, October 9`. */
export function longDateLabel(dateText: string, language: Language = DEFAULT_LANGUAGE): string {
  return `${weekdayName(dateText, language)}, ${dayAndMonthLong(dateText, language)}`;
}

/** `2026-10-09` → `9 tháng 10`, in English `October 9`. */
export function dayAndMonthLong(dateText: string, language: Language = DEFAULT_LANGUAGE): string {
  if (language === 'en') {
    const month = dateNamesOf(language).months[monthNumberOf(dateText) - 1] ?? '';
    return `${month} ${dayNumberOf(dateText)}`;
  }
  return `${dayNumberOf(dateText)} tháng ${monthNumberOf(dateText)}`;
}

/** `2026-10-09` → `9 tháng 10, 2026`, in English `October 9, 2026`. */
export function dateWithYear(dateText: string, language: Language = DEFAULT_LANGUAGE): string {
  return `${dayAndMonthLong(dateText, language)}, ${dateText.slice(0, 4)}`;
}

/** `2026-10-05`, `2026-10-11` → `5 – 11 tháng 10`, in English `Oct 5 – 11`. */
export function dayRange(from: string, to: string, language: Language = DEFAULT_LANGUAGE): string {
  const sameMonth = monthOf(from) === monthOf(to);
  if (!sameMonth) return `${dayAndMonth(from, language)} – ${dayAndMonth(to, language)}`;
  if (language === 'en') return `${dayAndMonth(from, language)} – ${dayNumberOf(to)}`;
  return `${dayNumberOf(from)} – ${dayNumberOf(to)} tháng ${monthNumberOf(to)}`;
}

/** `2026-10` → `Tháng 10, 2026`, in English `October 2026`. */
export function monthTitle(month: string, language: Language = DEFAULT_LANGUAGE): string {
  const [year, number] = month.split('-');
  if (language === 'en') return `${dateNamesOf(language).months[Number(number) - 1] ?? ''} ${year}`;
  return `Tháng ${Number(number)}, ${year}`;
}

/** `Hôm nay · 9/10`, `Hôm qua · 8/10`, otherwise `Thứ Tư · 7/10`. */
export function relativeDayLabel(
  dateText: string,
  today: string,
  language: Language = DEFAULT_LANGUAGE,
): string {
  return `${relativeDayName(dateText, today, language)} · ${dayAndMonth(dateText, language)}`;
}

function relativeDayName(dateText: string, today: string, language: Language): string {
  const names = dateNamesOf(language);
  if (dateText === today) return names.today;
  if (dateText === addDays(today, -1)) return names.yesterday;
  return weekdayName(dateText, language);
}

export function daysInMonth(month: string): number {
  const [year = 0, number = 1] = month.split('-').map(Number);
  return new Date(year, number, 0).getDate();
}
