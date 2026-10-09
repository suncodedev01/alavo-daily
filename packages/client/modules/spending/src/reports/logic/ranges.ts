import { addMonths, monthOf } from '@alavo-daily/common/format';

import type { DateRange, RangePreset } from '../types';

const QUARTER_MONTHS_BACK = 2;

export function presetRange(preset: Exclude<RangePreset, 'custom'>, today: string): DateRange {
  if (preset === 'year') return { from: `${today.slice(0, 4)}-01-01`, to: today };
  const monthsBack = preset === 'quarter' ? QUARTER_MONTHS_BACK : 0;
  return { from: `${addMonths(monthOf(today), -monthsBack)}-01`, to: today };
}

export function withFrom(range: DateRange, from: string): DateRange {
  return from > range.to ? { from, to: from } : { from, to: range.to };
}

export function withTo(range: DateRange, to: string): DateRange {
  return to < range.from ? { from: to, to } : { from: range.from, to };
}
