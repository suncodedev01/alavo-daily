import { describe, expect, it } from 'vitest';

import type { SyncState, SyncStatus } from '@alavo-daily/common';

import { describeSync } from './describeSync';

const keyAsText = (key: string, values?: Record<string, string | number>) =>
  values ? key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values[name])) : key;

const LAST_SYNC = new Date(2026, 9, 9, 13, 5).getTime();
const NOW = new Date(2026, 9, 9, 18, 0).getTime();

function status(state: SyncState, overrides: Partial<SyncStatus> = {}): SyncStatus {
  return {
    state,
    pendingEvents: 0,
    lastSyncedAt: LAST_SYNC,
    deviceId: 'd',
    accountEmail: 'person@example.com',
    error: null,
    conflictCount: 0,
    ...overrides,
  };
}

describe('describeSync', () => {
  it('describes the off state while the status is still loading', () => {
    expect(describeSync(undefined, keyAsText)).toMatchObject({ title: 'Chưa kết nối Google', icon: 'cloud-slash' });
  });

  it('describes sync that was never turned on', () => {
    expect(describeSync(status('off'), keyAsText)).toMatchObject({
      title: 'Chưa kết nối Google',
      subtitle: 'Dữ liệu chỉ ở máy này',
    });
  });

  it('describes a finished sync with the time', () => {
    expect(describeSync(status('idle'), keyAsText, NOW)).toMatchObject({
      title: 'Đã đồng bộ',
      subtitle: 'Lúc 13:05',
      icon: 'cloud-check',
    });
  });

  it('adds the day when the last sync was on another day', () => {
    const nextDay = new Date(2026, 9, 10, 8, 0).getTime();
    expect(describeSync(status('idle'), keyAsText, nextDay).subtitle).toBe('09/10 lúc 13:05');
  });

  it('says just now when no sync time is known yet', () => {
    expect(describeSync(status('idle', { lastSyncedAt: null }), keyAsText).subtitle).toBe('Vừa xong');
  });

  it('counts the changes still waiting even when connected', () => {
    expect(describeSync(status('idle', { pendingEvents: 2 }), keyAsText).subtitle).toBe('2 thay đổi đang chờ');
  });

  it('counts the waiting changes when offline and says offline when there are none', () => {
    expect(describeSync(status('offline', { pendingEvents: 3 }), keyAsText).subtitle).toBe('3 thay đổi đang chờ');
    expect(describeSync(status('offline'), keyAsText)).toMatchObject({
      title: 'Chưa đồng bộ',
      subtitle: 'Đang ngoại tuyến',
    });
  });

  it('describes syncing', () => {
    expect(describeSync(status('syncing'), keyAsText)).toMatchObject({
      title: 'Đang đồng bộ…',
      icon: 'arrows-clockwise',
    });
  });

  it('asks for a new sign-in', () => {
    expect(describeSync(status('needs_login'), keyAsText)).toMatchObject({
      title: 'Cần đăng nhập lại Google',
      subtitle: 'Bấm để đăng nhập lại',
    });
  });

  it('describes a failed round', () => {
    expect(describeSync(status('error', { error: 'drive' }), keyAsText)).toMatchObject({
      title: 'Đồng bộ chưa thành công',
      icon: 'warning',
    });
  });

  it('puts conflicts first, whatever else is going on', () => {
    expect(describeSync(status('idle', { conflictCount: 1 }), keyAsText).title).toBe('Cần chọn bản dữ liệu');
    expect(describeSync(status('syncing', { conflictCount: 2 }), keyAsText).title).toBe('Cần chọn bản dữ liệu');
  });

  it('does not show conflicts once sync is off', () => {
    expect(describeSync(status('off', { conflictCount: 1 }), keyAsText).title).toBe('Chưa kết nối Google');
  });
});
