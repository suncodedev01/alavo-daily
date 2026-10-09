import type { PlatformServices } from './index';

interface WakeLockSentinelLike {
  release(): Promise<void>;
}

/** Browser implementation, used by the web app. */
export function createWebPlatform(): PlatformServices {
  return {
    capabilities: {
      backgroundReminders: false,
      keepAwake: typeof navigator !== 'undefined' && 'wakeLock' in navigator,
      importFromUrl: false,
      googleSync: true,
    },
    keepAwake: requestWakeLock,
    saveTextFile: downloadTextFile,
    openLink: async (url) => void window.open(url, '_blank', 'noopener,noreferrer'),
    notify: showNotification,
  };
}

async function requestWakeLock(): Promise<() => void> {
  const wakeLock = (navigator as Navigator & {
    wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> };
  }).wakeLock;
  if (!wakeLock) return () => undefined;
  const sentinel = await wakeLock.request('screen');
  return () => void sentinel.release();
}

async function downloadTextFile(filename: string, content: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function showNotification(title: string, body: string): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  const permission =
    Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (permission !== 'granted') return false;
  new Notification(title, { body });
  return true;
}
