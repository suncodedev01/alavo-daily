import type { MenhId } from '../types';
import { lunarYearOf, menhOfYear, parseYear } from './menh';

export interface MenhChoice {
  menh: MenhId | null;
  yearText: string;
  beforeTet: boolean;
}

export const EMPTY_MENH_CHOICE: MenhChoice = { menh: null, yearText: '', beforeTet: false };

export function withYearText(choice: MenhChoice, yearText: string): MenhChoice {
  const year = parseYear(yearText);
  if (year === null) return { ...choice, yearText };
  return { ...choice, yearText, menh: menhOfYear(year, { beforeTet: choice.beforeTet }) };
}

export function withBeforeTet(choice: MenhChoice, beforeTet: boolean): MenhChoice {
  return withYearText({ ...choice, beforeTet }, choice.yearText);
}

export function withMenh(choice: MenhChoice, menh: MenhId): MenhChoice {
  const year = parseYear(choice.yearText);
  const yearAgrees = year !== null && menhOfYear(year, { beforeTet: choice.beforeTet }) === menh;
  return { ...choice, menh, yearText: year === null || yearAgrees ? choice.yearText : '' };
}

export function lunarYearOfChoice(choice: MenhChoice): number | null {
  const year = parseYear(choice.yearText);
  return year === null ? null : lunarYearOf({ year, beforeTet: choice.beforeTet });
}
