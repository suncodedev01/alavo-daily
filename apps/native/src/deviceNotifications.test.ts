import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const plugin = vi.hoisted(() => ({
  isPermissionGranted: vi.fn(),
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

describe('the small icon in the status bar', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is the white house glyph on Android', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 14)' });
    await showNow('a', 'b');
    expect(plugin.sendNotification).toHaveBeenCalledWith(expect.objectContaining({ icon: 'ic_notification' }));
  });

  it('is left to the system on other devices', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0)' });
    await showNow('a', 'b');
    expect(plugin.sendNotification.mock.calls[0]![0]).not.toHaveProperty('icon');
  });
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

  it('runs overlapping calls one after another so they cannot cancel each other', async () => {
    const order: string[] = [];
    plugin.pending.mockImplementation(async () => {
      order.push('pending');
      return [];
    });
    plugin.cancel.mockImplementation(async () => void order.push('cancel'));
    plugin.sendNotification.mockImplementation(() => void order.push('send'));
    const item = { id: 1, at: NOW + HOUR, title: 'a', body: 'b' };
    await Promise.all([scheduleOnDevice([item]), scheduleOnDevice([item])]);
    expect(order).toEqual(['pending', 'cancel', 'send', 'pending', 'cancel', 'send']);
  });

  it('sends the button set and what the notification is about along with it', async () => {
    await scheduleOnDevice([
      {
        id: 7,
        at: NOW + HOUR,
        title: 'a',
        body: 'b',
        actionTypeId: 'dish-reminder',
        data: { recipeId: 'recipe-1' },
      },
    ]);
    expect(plugin.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ actionTypeId: 'dish-reminder', extra: { recipeId: 'recipe-1' } }),
    );
  });

  it('schedules nothing while permission is not granted', async () => {
    plugin.isPermissionGranted.mockResolvedValue(false);
    await scheduleOnDevice([{ id: 3, at: NOW + HOUR, title: 'a', body: 'b' }]);
    expect(plugin.cancel).not.toHaveBeenCalled();
    expect(plugin.sendNotification).not.toHaveBeenCalled();
  });
});

describe('showNow', () => {
  it('shows the notification and reports success', async () => {
    expect(await showNow('Tiêu đề', 'Nội dung')).toBe(true);
    expect(plugin.sendNotification).toHaveBeenCalledWith({ title: 'Tiêu đề', body: 'Nội dung' });
  });

  it('shows the buttons and the extra data when asked to', async () => {
    await showNow('a', 'b', { actionTypeId: 'budget-warning', data: { categoryId: 'category-food' } });
    expect(plugin.sendNotification).toHaveBeenCalledWith({
      title: 'a',
      body: 'b',
      actionTypeId: 'budget-warning',
      extra: { categoryId: 'category-food' },
    });
  });

  it('reports false without showing when permission is not granted', async () => {
    plugin.isPermissionGranted.mockResolvedValue(false);
    expect(await showNow('a', 'b')).toBe(false);
    expect(plugin.sendNotification).not.toHaveBeenCalled();
  });
});
