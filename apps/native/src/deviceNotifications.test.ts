import { beforeEach, describe, expect, it, vi } from 'vitest';

const plugin = vi.hoisted(() => ({
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  pending: vi.fn(),
  cancel: vi.fn(),
  sendNotification: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-notification', () => ({
  ...plugin,
  Schedule: { at: (date: Date) => ({ at: { date } }) },
}));

import { scheduleOnDevice, showNow } from './deviceNotifications';

const NOW = new Date(2026, 9, 10, 5, 30).getTime();
const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  plugin.isPermissionGranted.mockResolvedValue(true);
  plugin.pending.mockResolvedValue([]);
});

describe('scheduleOnDevice', () => {
  it('hands each future notification to the system with its time', async () => {
    await scheduleOnDevice([{ id: 7, at: NOW + HOUR, title: 'Hôm nay ăn gì?', body: 'Bún chả' }]);
    expect(plugin.sendNotification).toHaveBeenCalledWith({
      id: 7,
      title: 'Hôm nay ăn gì?',
      body: 'Bún chả',
      schedule: { at: { date: new Date(NOW + HOUR) } },
    });
  });

  it('cancels what was waiting before it schedules the new list', async () => {
    plugin.pending.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    await scheduleOnDevice([{ id: 3, at: NOW + HOUR, title: 'a', body: 'b' }]);
    expect(plugin.cancel).toHaveBeenCalledWith([1, 2]);
    expect(plugin.cancel.mock.invocationCallOrder[0]!).toBeLessThan(
      plugin.sendNotification.mock.invocationCallOrder[0]!,
    );
  });

  it('skips notifications whose time has passed', async () => {
    await scheduleOnDevice([{ id: 3, at: NOW - 1, title: 'a', body: 'b' }]);
    expect(plugin.sendNotification).not.toHaveBeenCalled();
  });

  it('asks for permission once and schedules nothing when it is refused', async () => {
    plugin.isPermissionGranted.mockResolvedValue(false);
    plugin.requestPermission.mockResolvedValue('denied');
    await scheduleOnDevice([{ id: 3, at: NOW + HOUR, title: 'a', body: 'b' }]);
    expect(plugin.requestPermission).toHaveBeenCalledTimes(1);
    expect(plugin.cancel).not.toHaveBeenCalled();
    expect(plugin.sendNotification).not.toHaveBeenCalled();
  });

  it('schedules after the person grants permission', async () => {
    plugin.isPermissionGranted.mockResolvedValue(false);
    plugin.requestPermission.mockResolvedValue('granted');
    await scheduleOnDevice([{ id: 3, at: NOW + HOUR, title: 'a', body: 'b' }]);
    expect(plugin.sendNotification).toHaveBeenCalledTimes(1);
  });
});

describe('showNow', () => {
  it('shows the notification and reports success', async () => {
    expect(await showNow('Tiêu đề', 'Nội dung')).toBe(true);
    expect(plugin.sendNotification).toHaveBeenCalledWith({ title: 'Tiêu đề', body: 'Nội dung' });
  });

  it('reports false without showing when permission is refused', async () => {
    plugin.isPermissionGranted.mockResolvedValue(false);
    plugin.requestPermission.mockResolvedValue('denied');
    expect(await showNow('a', 'b')).toBe(false);
    expect(plugin.sendNotification).not.toHaveBeenCalled();
  });
});
