import { useReminderSource, type NotificationActionEvent, type ScheduledNotification } from '@alavo-daily/common';
import { useCallback, useEffect, useState } from 'react';

import { dropExpired, nextExpiry, withSnooze } from '../logic/snooze';
import { loadSnoozed, saveSnoozed } from '../logic/snoozeStorage';

const SOURCE = 'hub.snoozed';

/**
 * Keeps the reminders the person postponed with "snooze" in the merged reminder list until they
 * fire, and returns the function that postpones another one.
 */
export function useSnoozedReminders(): (event: NotificationActionEvent) => void {
  const [snoozed, setSnoozed] = useState<ScheduledNotification[]>(() => loadSnoozed(Date.now()));
  useReminderSource(SOURCE, snoozed);
  useEffect(() => saveSnoozed(snoozed), [snoozed]);
  useEffect(() => forgetWhenFired(snoozed, setSnoozed), [snoozed]);
  return useCallback((event) => setSnoozed((current) => withSnooze(current, event, Date.now())), []);
}

function forgetWhenFired(
  snoozed: ScheduledNotification[],
  update: (change: (current: ScheduledNotification[]) => ScheduledNotification[]) => void,
): (() => void) | undefined {
  const expiry = nextExpiry(snoozed);
  if (expiry === null) return undefined;
  const timer = setTimeout(() => update((current) => dropExpired(current, Date.now())), expiry - Date.now() + 1);
  return () => clearTimeout(timer);
}
