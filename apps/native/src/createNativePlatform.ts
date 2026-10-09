import {
  createInPageScheduler,
  type NotificationPermissionState,
  type PlatformServices,
  type ScheduledNotification,
} from '@alavo-daily/common';
import { openUrl } from '@tauri-apps/plugin-opener';

import { isGoogleConfigured } from './buildConfig';
import { isMobileDevice, scheduleOnDevice, showNow } from './deviceNotifications';
import { fetchPage } from './fetchPage';
import { createGoogleAuth } from './googleAuth';
import { readPermission, requestPermission } from './notificationPermission';
import { saveTextFile } from './saveTextFile';

/**
 * Native implementation, used by the Tauri app. Phones hand reminders to the operating system so
 * they show while the app is closed. Desktop has no such scheduling, so reminders show only while
 * the app is open.
 */
export function createNativePlatform(): PlatformServices {
  const mobile = isMobileDevice();
  const googleSync = isGoogleConfigured();
  const reminders = createReminderScheduling(mobile);
  return {
    capabilities: { backgroundReminders: mobile, keepAwake: true, importFromUrl: true, googleSync },
    keepAwake: async () => () => undefined,
    saveTextFile,
    openLink: openUrl,
    notify: showNow,
    scheduleNotifications: reminders.schedule,
    notificationPermission: readPermission,
    requestNotificationPermission: async () => reminders.rescheduleOnGrant(await requestPermission()),
    fetchPage,
    googleAuth: googleSync ? createGoogleAuth() : null,
  };
}

interface ReminderScheduling {
  schedule(items: ScheduledNotification[]): Promise<void>;
  rescheduleOnGrant(permission: NotificationPermissionState): Promise<NotificationPermissionState>;
}

function createReminderScheduling(mobile: boolean): ReminderScheduling {
  const deliver = mobile ? scheduleOnDevice : createInPageScheduler(showNow);
  let latest: ScheduledNotification[] = [];
  return {
    schedule: (items) => {
      latest = items;
      return deliver(items);
    },
    rescheduleOnGrant: async (permission) => {
      if (permission === 'granted') await deliver(latest);
      return permission;
    },
  };
}
