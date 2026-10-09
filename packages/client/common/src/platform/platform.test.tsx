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

  it('notify returns false when notifications are not supported', async () => {
    vi.stubGlobal('Notification', undefined);
    expect(await createWebPlatform().notify('a', 'b')).toBe(false);
  });
});
