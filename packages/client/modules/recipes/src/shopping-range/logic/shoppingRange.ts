import { addDays } from '@alavo-daily/common/format';

import type { DateRange } from '../types';
import { PLAN_DAYS } from '../../vocabulary';

export function shoppingRange(weekStart: string, today: string): DateRange {
  const to = addDays(weekStart, PLAN_DAYS - 1);
  return { from: today > to ? weekStart : today, to };
}
