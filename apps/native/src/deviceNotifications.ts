import type { ScheduledNotification } from '@alavo-daily/common';
import { Schedule, cancel, isPermissionGranted, pending, sendNotification } from '@tauri-apps/plugin-notification';

export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad/i.test(navigator.userAgent);
}

export async function showNow(title: string, body: string): Promise<boolean> {
  if (!(await isPermissionGranted())) return false;
  sendNotification({ title, body });
  return true;
}

let lastSchedule: Promise<void> = Promise.resolve();

/**
 * Hands the notifications to the operating system, which shows them even when the app is closed.
 * Calls run one after another, because two overlapping calls would cancel each other's work.
 */
export function scheduleOnDevice(items: ScheduledNotification[]): Promise<void> {
  lastSchedule = lastSchedule.then(() => replaceSchedule(items)).catch(() => undefined);
  return lastSchedule;
}

async function replaceSchedule(items: ScheduledNotification[]): Promise<void> {
  if (!(await isPermissionGranted())) return;
  const waiting = await pending();
  await cancel(waiting.map((notification) => notification.id));
  const now = Date.now();
  items
    .filter((item) => item.at > now)
    .forEach(({ id, at, title, body }) =>
      sendNotification({ id, title, body, schedule: Schedule.at(new Date(at), false, true) }),
    );
}
