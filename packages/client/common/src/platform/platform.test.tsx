import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlatformProvider, createWebPlatform, usePlatform } from './index';
import { createFakePlatform } from '../testing';

function Reader() {
  const platform = usePlatform();
  return <p>{platform.capabilities.keepAwake ? 'awake' : 'no-wake'}</p>;
}

afterEach(() => vi.unstubAllGlobals());

describe('usePlatform', () => {
  it('reads the provided services', () => {
    render(
      <PlatformProvider platform={createFakePlatform()}>
        <Reader />
      </PlatformProvider>,
    );
    expect(screen.getByText('awake')).toBeInTheDocument();
  });

  it('fails clearly outside a provider', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Reader />)).toThrow('usePlatform must be used inside <PlatformProvider>');
    quiet.mockRestore();
  });
});

describe('createWebPlatform', () => {
  it('does not promise reminders while the app is closed', () => {
    expect(createWebPlatform().capabilities.backgroundReminders).toBe(false);
    expect(createWebPlatform().capabilities.importFromUrl).toBe(false);
  });

  it('keepAwake is a no-op release when the browser has no wake lock', async () => {
    vi.stubGlobal('navigator', {});
    const release = await createWebPlatform().keepAwake();
    expect(release).toBeTypeOf('function');
    expect(() => release()).not.toThrow();
  });

  it('keepAwake holds a screen wake lock and releases it', async () => {
    const release = vi.fn(async () => undefined);
    const request = vi.fn(async () => ({ release }));
    vi.stubGlobal('navigator', { wakeLock: { request } });
    const stop = await createWebPlatform().keepAwake();
    expect(request).toHaveBeenCalledWith('screen');
    stop();
    expect(release).toHaveBeenCalled();
  });

  describe('scheduleNotifications', () => {
    const shown = vi.fn();

    function stubNotifications() {
      shown.mockClear();
      class FakeNotification {
        static permission = 'granted';
        constructor(title: string, options: { body: string }) {
          shown(title, options.body);
        }
      }
      vi.stubGlobal('Notification', FakeNotification);
    }

    afterEach(() => vi.useRealTimers());

    it('shows a notification when its time comes while the page is open', async () => {
      vi.useFakeTimers();
      stubNotifications();
      await createWebPlatform().scheduleNotifications([
        { id: 1, at: Date.now() + 60_000, title: 'Hôm nay ăn gì?', body: 'Bún chả' },
      ]);
      expect(shown).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(60_000);
      expect(shown).toHaveBeenCalledWith('Hôm nay ăn gì?', 'Bún chả');
    });

    it('replaces what was scheduled before', async () => {
      vi.useFakeTimers();
      stubNotifications();
      const platform = createWebPlatform();
      await platform.scheduleNotifications([{ id: 1, at: Date.now() + 1_000, title: 'cũ', body: '' }]);
      await platform.scheduleNotifications([{ id: 2, at: Date.now() + 2_000, title: 'mới', body: '' }]);
      await vi.advanceTimersByTimeAsync(5_000);
      expect(shown).toHaveBeenCalledTimes(1);
      expect(shown).toHaveBeenCalledWith('mới', '');
    });

    it('skips times that already passed', async () => {
      vi.useFakeTimers();
      stubNotifications();
      await createWebPlatform().scheduleNotifications([
        { id: 1, at: Date.now() - 1_000, title: 'đã qua', body: '' },
      ]);
      await vi.advanceTimersByTimeAsync(5_000);
      expect(shown).not.toHaveBeenCalled();
    });
  });

  it('notify returns false when notifications are not supported', async () => {
    vi.stubGlobal('Notification', undefined);
    expect(await createWebPlatform().notify('a', 'b')).toBe(false);
  });
});
