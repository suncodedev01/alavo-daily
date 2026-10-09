import type { SyncStatus } from '@alavo-daily/common';

import { formatLastSync } from './formatLastSync';

type Translate = (key: string, values?: Record<string, string | number>) => string;

export interface SyncDescription {
  icon: string;
  title: string;
  subtitle: string;
}

/** One description of sync for every place that shows it: the sidebar row and the settings page. */
export function describeSync(
  status: SyncStatus | undefined,
  t: Translate,
  now: number = Date.now(),
): SyncDescription {
  if (!status || status.state === 'off') return describeOff(t);
  if (status.conflictCount > 0) return describeConflict(t);
  switch (status.state) {
    case 'syncing':
      return describe('arrows-clockwise', t('Đang đồng bộ…'), t('Đừng đóng ứng dụng'));
    case 'needs_login':
      return describe('cloud-slash', t('Cần đăng nhập lại Google'), t('Bấm để đăng nhập lại'));
    case 'offline':
      return describe('cloud-slash', t('Chưa đồng bộ'), describeWaiting(status.pendingEvents, t));
    case 'error':
      return describe('warning', t('Đồng bộ chưa thành công'), t('Bấm để xem và thử lại'));
    default:
      return describe('cloud-check', t('Đã đồng bộ'), describeLastSync(status, t, now));
  }
}

function describe(icon: string, title: string, subtitle: string): SyncDescription {
  return { icon, title, subtitle };
}

function describeOff(t: Translate): SyncDescription {
  return describe('cloud-slash', t('Chưa kết nối Google'), t('Dữ liệu chỉ ở máy này'));
}

function describeConflict(t: Translate): SyncDescription {
  return describe('cloud', t('Cần chọn bản dữ liệu'), t('Hai thiết bị cùng sửa'));
}

function describeWaiting(pending: number, t: Translate): string {
  return pending > 0 ? t('{{count}} thay đổi đang chờ', { count: pending }) : t('Đang ngoại tuyến');
}

function describeLastSync(status: SyncStatus, t: Translate, now: number): string {
  if (status.pendingEvents > 0) return t('{{count}} thay đổi đang chờ', { count: status.pendingEvents });
  if (status.lastSyncedAt === null) return t('Vừa xong');
  return formatLastSync(status.lastSyncedAt, t, now);
}
