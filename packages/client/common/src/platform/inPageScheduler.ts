import type { ScheduledNotification } from './index';

const MAX_TIMER_DELAY_MS = 2 ** 31 - 1;

type Show = (title: string, body: string) => Promise<unknown>;

/**
 * Schedules notifications with timers inside the page, so they only show while the app is open.
 * Every call replaces the timers of the previous call.
 */
export function createInPageScheduler(show: Show): (items: ScheduledNotification[]) => Promise<void> {
  let timers: ReturnType<typeof setTimeout>[] = [];
  return async (items) => {
    timers.forEach(clearTimeout);
    const now = Date.now();
    timers = items
      .map((item) => ({ item, delay: item.at - now }))
      .filter(({ delay }) => delay > 0 && delay <= MAX_TIMER_DELAY_MS)
      .map(({ item, delay }) => setTimeout(() => void show(item.title, item.body), delay));
  };
}
