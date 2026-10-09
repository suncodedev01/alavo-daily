import type { ScheduledNotification } from '@alavo-daily/common';

import { dropExpired } from './snooze';

const STORAGE_KEY = 'hub.snoozed-reminders';

export function loadSnoozed(now: number): ScheduledNotification[] {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(saved) ? dropExpired(saved.filter(isReminder), now) : [];
  } catch {
    return [];
  }
}

export function saveSnoozed(items: ScheduledNotification[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    return;
  }
}

function isReminder(value: unknown): value is ScheduledNotification {
  const item = value as Partial<ScheduledNotification> | null;
  return (
    typeof item?.id === 'number' &&
    typeof item.at === 'number' &&
    typeof item.title === 'string' &&
    typeof item.body === 'string'
  );
}
