import { toDateText } from '@alavo-daily/common';

export function todayText(): string {
  return toDateText(new Date());
}
