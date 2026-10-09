import { describe, expect, it } from 'vitest';

import type { SyncState } from '@alavo-daily/common';

import { describeSync } from './describeSync';

const keyAsText = (key: string, values?: Record<string, string | number>) =>
  values ? key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values[name])) : key;

describe('describeSync', () => {
  const status = (state: SyncState) => ({
    state,
    pendingEvents: 3,
    lastSyncedAt: new Date(2026, 9, 9, 13, 5).getTime(),
    deviceId: 'd',
  });

  it('describes the off state while the status is still loading', () => {
    expect(describeSync(undefined, keyAsText)).toMatchObject({ title: 'Chưa kết nối Google', icon: 'cloud-slash' });
  });

  it('describes a connected state with the last sync time', () => {
    expect(describeSync(status('connected'), keyAsText)).toMatchObject({
      title: 'Đã đồng bộ',
      subtitle: 'Lúc 13:05',
      icon: 'cloud-check',
    });
  });

  it('counts the waiting changes when offline', () => {
    expect(describeSync(status('offline'), keyAsText).subtitle).toBe('3 thay đổi đang chờ');
  });

  it('describes syncing, connecting and conflict', () => {
    expect(describeSync(status('syncing'), keyAsText).title).toBe('Đang đồng bộ…');
    expect(describeSync(status('connecting'), keyAsText).title).toBe('Đang kết nối…');
    expect(describeSync(status('conflict'), keyAsText).title).toBe('Cần chọn bản dữ liệu');
  });
});
