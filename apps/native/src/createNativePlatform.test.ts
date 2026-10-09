import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-notification', () => ({
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  pending: vi.fn(),
  cancel: vi.fn(),
  sendNotification: vi.fn(),
  Schedule: { at: vi.fn() },
}));

import { createNativePlatform } from './createNativePlatform';

function useUserAgent(userAgent: string) {
  vi.stubGlobal('navigator', { userAgent });
}

afterEach(() => vi.unstubAllGlobals());

describe('createNativePlatform', () => {
  it('promises reminders while the app is closed on an Android phone', () => {
    useUserAgent('Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36');
    expect(createNativePlatform().capabilities.backgroundReminders).toBe(true);
  });

  it('promises reminders while the app is closed on an iPhone', () => {
    useUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
    expect(createNativePlatform().capabilities.backgroundReminders).toBe(true);
  });

  it('does not promise reminders while the app is closed on desktop', () => {
    useUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    expect(createNativePlatform().capabilities.backgroundReminders).toBe(false);
  });

  it('does not offer Google sync yet', () => {
    useUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    expect(createNativePlatform().capabilities.googleSync).toBe(false);
  });
});
