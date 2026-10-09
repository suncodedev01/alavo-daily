import type { SyncState } from '@alavo-daily/common';

export type QuickSyncAction = 'open-settings' | 'sign-in' | 'sync';

export interface QuickSync {
  action: QuickSyncAction;
  label: string;
}

type Translate = (key: string) => string;

/** What the quick sync button on the home screen does for each sync state. */
export function quickSyncFor(state: SyncState | undefined, t: Translate): QuickSync {
  if (!state || state === 'off') return { action: 'open-settings', label: t('Kết nối với Google') };
  if (state === 'needs_login') return { action: 'sign-in', label: t('Đăng nhập lại Google') };
  return { action: 'sync', label: t('Đồng bộ ngay') };
}
