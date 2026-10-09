import type { NotificationPermissionState } from '@alavo-daily/common';
import { isPermissionGranted, requestPermission as askForPermission } from '@tauri-apps/plugin-notification';

export async function readPermission(): Promise<NotificationPermissionState> {
  return (await isPermissionGranted()) ? 'granted' : 'prompt';
}

export async function requestPermission(): Promise<NotificationPermissionState> {
  return (await askForPermission()) === 'granted' ? 'granted' : 'denied';
}
