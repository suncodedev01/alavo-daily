import { createInPageScheduler, type PlatformServices } from '@alavo-daily/common';

import { isMobileDevice, scheduleOnDevice, showNow } from './deviceNotifications';

/**
 * Native implementation, used by the Tauri app. Phones hand reminders to the operating system so
 * they show while the app is closed. Desktop has no such scheduling, so reminders show only while
 * the app is open.
 */
export function createNativePlatform(): PlatformServices {
  const mobile = isMobileDevice();
  return {
    capabilities: {
      backgroundReminders: mobile,
      keepAwake: true,
      importFromUrl: false,
      googleSync: false,
    },
    keepAwake: async () => () => undefined,
    saveTextFile: downloadTextFile,
    openLink: async (url) => void window.open(url, '_blank', 'noopener,noreferrer'),
    notify: showNow,
    scheduleNotifications: mobile ? scheduleOnDevice : createInPageScheduler(showNow),
  };
}

async function downloadTextFile(filename: string, content: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
