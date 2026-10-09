import { createInPageScheduler } from './inPageScheduler';
import type { NotificationPermissionState, PlatformServices } from './index';
import { createWebGoogleAuth, type WebGoogleAuthOptions } from './webGoogleAuth';

interface WakeLockSentinelLike {
  release(): Promise<void>;
}

export interface WebPlatformOptions {
  /** The OAuth client id for Google sign-in. Without one, Google sync is switched off. */
  googleClientId?: string;
  loadGoogle?: WebGoogleAuthOptions['loadGoogle'];
}

/** Browser implementation, used by the web app. */
export function createWebPlatform(options: WebPlatformOptions = {}): PlatformServices {
  const clientId = (options.googleClientId ?? import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ?? '').trim();
  return {
    capabilities: {
      backgroundReminders: false,
      keepAwake: typeof navigator !== 'undefined' && 'wakeLock' in navigator,
      importFromUrl: false,
      googleSync: clientId !== '',
    },
    keepAwake: requestWakeLock,
    saveTextFile: downloadTextFile,
    openLink: async (url) => void window.open(url, '_blank', 'noopener,noreferrer'),
    notify: showNotification,
    scheduleNotifications: createInPageScheduler(showNotification),
    notificationPermission: readNotificationPermission,
    requestNotificationPermission: askNotificationPermission,
    fetchPage: async () => {
      throw new Error('The browser cannot fetch other sites without a server');
    },
    googleAuth: clientId ? createWebGoogleAuth({ clientId, loadGoogle: options.loadGoogle }) : null,
  };
}

function readNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof Notification === 'undefined') return Promise.resolve('unsupported');
  const state = Notification.permission;
  return Promise.resolve(state === 'default' ? 'prompt' : state);
}

async function askNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof Notification === 'undefined') return 'unsupported';
  const state = await Notification.requestPermission();
  return state === 'default' ? 'prompt' : state;
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
