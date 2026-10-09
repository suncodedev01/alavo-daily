import { addDays, dayAndMonth, toDateText } from '@alavo-daily/common';

import { formatTimeOfDay } from '../../clock';

/** `17:30` today, `Hôm qua · 16:00` yesterday, otherwise `7/10 · 19:40`. */
export function formatNotificationTime(unixMs: number, today: string): string {
  const day = toDateText(new Date(unixMs));
  const time = formatTimeOfDay(unixMs);
  if (day === today) return time;
  if (day === addDays(today, -1)) return `Hôm qua · ${time}`;
  return `${dayAndMonth(day)} · ${time}`;
}
