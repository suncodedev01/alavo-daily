import { describe, expect, it } from 'vitest';

import { quickSyncFor } from './quickSync';

const t = (key: string) => key;

describe('quickSyncFor', () => {
  it('sends a device that is not connected to the settings page', () => {
    expect(quickSyncFor('off', t)).toEqual({ action: 'open-settings', label: 'Kết nối với Google' });
    expect(quickSyncFor(undefined, t).action).toBe('open-settings');
  });

  it('asks to sign in again when the Google login expired', () => {
    expect(quickSyncFor('needs_login', t)).toEqual({ action: 'sign-in', label: 'Đăng nhập lại Google' });
  });

  it.each(['idle', 'offline', 'error', 'syncing'] as const)('syncs now while the state is %s', (state) => {
    expect(quickSyncFor(state, t)).toEqual({ action: 'sync', label: 'Đồng bộ ngay' });
  });
});
