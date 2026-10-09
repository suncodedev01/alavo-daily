import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const plugin = vi.hoisted(() => ({
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  pending: vi.fn(),
  cancel: vi.fn(),
  sendNotification: vi.fn(),
}));
const build = vi.hoisted(() => ({ isGoogleConfigured: vi.fn() }));

vi.mock('@tauri-apps/plugin-notification', () => ({
  ...plugin,
  Schedule: { at: (date: Date) => ({ at: { date } }) },
}));
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('./buildConfig', () => build);

import { createNativePlatform } from './createNativePlatform';

const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function useUserAgent(userAgent: string) {
  vi.stubGlobal('navigator', { userAgent });
}

beforeEach(() => {
  vi.resetAllMocks();
  build.isGoogleConfigured.mockReturnValue(false);
  plugin.pending.mockResolvedValue([]);
});

afterEach(() => vi.unstubAllGlobals());

describe('background reminders', () => {
  it('are promised on an Android phone', () => {
    useUserAgent(ANDROID);
    expect(createNativePlatform().capabilities.backgroundReminders).toBe(true);
  });

  it('are promised on an iPhone', () => {
    useUserAgent(IPHONE);
    expect(createNativePlatform().capabilities.backgroundReminders).toBe(true);
  });

  it('are not promised on desktop', () => {
    useUserAgent(WINDOWS);
    expect(createNativePlatform().capabilities.backgroundReminders).toBe(false);
  });
});

describe('Google sync', () => {
  it('is off when the build has no Google credentials', () => {
    useUserAgent(WINDOWS);
    const platform = createNativePlatform();
    expect(platform.capabilities.googleSync).toBe(false);
    expect(platform.googleAuth).toBeNull();
  });

  it('is on when the build has Google credentials', () => {
    useUserAgent(WINDOWS);
    build.isGoogleConfigured.mockReturnValue(true);
    const platform = createNativePlatform();
    expect(platform.capabilities.googleSync).toBe(true);
    expect(platform.googleAuth).not.toBeNull();
  });
});

describe('importing a recipe from a link', () => {
  it('is available', () => {
    useUserAgent(WINDOWS);
    expect(createNativePlatform().capabilities.importFromUrl).toBe(true);
  });
});

describe('notification permission', () => {
  it('reads granted when the system already allows notifications', async () => {
    useUserAgent(WINDOWS);
    plugin.isPermissionGranted.mockResolvedValue(true);
    expect(await createNativePlatform().notificationPermission()).toBe('granted');
  });

  it('reads prompt when the person has not allowed notifications yet', async () => {
    useUserAgent(WINDOWS);
    plugin.isPermissionGranted.mockResolvedValue(false);
    expect(await createNativePlatform().notificationPermission()).toBe('prompt');
  });

  it('reports denied when the person refuses', async () => {
    useUserAgent(ANDROID);
    plugin.requestPermission.mockResolvedValue('denied');
    expect(await createNativePlatform().requestNotificationPermission()).toBe('denied');
  });

  it('hands the earlier reminders to the system once the person allows notifications', async () => {
    useUserAgent(ANDROID);
    const at = Date.now() + 60 * 60 * 1000;
    plugin.isPermissionGranted.mockResolvedValue(false);
    const platform = createNativePlatform();
    await platform.scheduleNotifications([{ id: 4, at, title: 'Nhắc', body: 'Nấu cơm' }]);
    expect(plugin.sendNotification).not.toHaveBeenCalled();

    plugin.requestPermission.mockResolvedValue('granted');
    plugin.isPermissionGranted.mockResolvedValue(true);
    expect(await platform.requestNotificationPermission()).toBe('granted');
    expect(plugin.sendNotification).toHaveBeenCalledWith(expect.objectContaining({ id: 4, title: 'Nhắc' }));
  });
});
