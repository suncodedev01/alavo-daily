import { formatTimeOfDay } from '../../clock';

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** "Lúc 13:05" for today, "08/10 lúc 13:05" for an earlier day. */
export function formatLastSync(lastSyncedAt: number, t: Translate, now: number = Date.now()): string {
  const time = formatTimeOfDay(lastSyncedAt);
  if (isSameDay(lastSyncedAt, now)) return t('Lúc {{time}}', { time });
  return t('{{date}} lúc {{time}}', { date: formatDayMonth(lastSyncedAt), time });
}

function isSameDay(first: number, second: number): boolean {
  const a = new Date(first);
  const b = new Date(second);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDayMonth(unixMs: number): string {
  const date = new Date(unixMs);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}
