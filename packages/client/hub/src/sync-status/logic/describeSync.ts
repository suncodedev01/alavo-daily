import type { SyncStatus } from '@alavo-daily/common';

import { formatTimeOfDay } from '../../clock';

type Translate = (key: string, values?: Record<string, string | number>) => string;

export interface SyncDescription {
  icon: string;
  title: string;
  subtitle: string;
}

export function describeSync(status: SyncStatus | undefined, t: Translate): SyncDescription {
  const pending = status?.pendingEvents ?? 0;
  switch (status?.state) {
    case 'connecting':
      return { icon: 'arrows-clockwise', title: t('Đang kết nối…'), subtitle: t('Chờ đăng nhập Google') };
    case 'syncing':
      return {
        icon: 'arrows-clockwise',
        title: t('Đang đồng bộ…'),
        subtitle: t('Đừng đóng ứng dụng'),
      };
    case 'connected':
      return { icon: 'cloud-check', title: t('Đã đồng bộ'), subtitle: lastSyncedText(status.lastSyncedAt, t) };
    case 'offline':
      return {
        icon: 'cloud-slash',
        title: t('Chưa đồng bộ'),
        subtitle: t('{{count}} thay đổi đang chờ', { count: pending }),
      };
    case 'conflict':
      return { icon: 'cloud', title: t('Cần chọn bản dữ liệu'), subtitle: t('Hai thiết bị cùng sửa') };
    default:
      return {
        icon: 'cloud-slash',
        title: t('Chưa kết nối Google'),
        subtitle: t('Dữ liệu chỉ ở máy này'),
      };
  }
}

function lastSyncedText(lastSyncedAt: number | null, t: Translate): string {
  return lastSyncedAt === null ? t('Vừa xong') : t('Lúc {{time}}', { time: formatTimeOfDay(lastSyncedAt) });
}
