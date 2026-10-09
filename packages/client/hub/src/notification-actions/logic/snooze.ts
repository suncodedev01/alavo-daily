import { notificationId, type NotificationActionEvent, type ScheduledNotification } from '@alavo-daily/common';

import { SNOOZE_MINUTES } from './actionIds';

const MINUTE_MS = 60 * 1000;

export function dropExpired(items: ScheduledNotification[], now: number): ScheduledNotification[] {
  const upcoming = items.filter((item) => item.at > now);
  return upcoming.length === items.length ? items : upcoming;
}

export function nextExpiry(items: ScheduledNotification[]): number | null {
  return items.length === 0 ? null : Math.min(...items.map((item) => item.at));
}

/** The same notification again `SNOOZE_MINUTES` after `now`, or null when it is unknown. */
export function snoozedCopy(event: NotificationActionEvent, now: number): ScheduledNotification | null {
  if (event.title === '') return null;
  const copy: ScheduledNotification = {
    id: notificationId(`snooze:${event.notificationId ?? event.title}`),
    at: now + SNOOZE_MINUTES * MINUTE_MS,
    title: event.title,
    body: event.body,
  };
  if (event.actionTypeId) copy.actionTypeId = event.actionTypeId;
  if (Object.keys(event.data).length > 0) copy.data = event.data;
  return copy;
}

export function withSnooze(
  current: ScheduledNotification[],
  event: NotificationActionEvent,
  now: number,
): ScheduledNotification[] {
  const copy = snoozedCopy(event, now);
  if (!copy) return current;
  return [...dropExpired(current, now).filter((item) => item.id !== copy.id), copy];
}
