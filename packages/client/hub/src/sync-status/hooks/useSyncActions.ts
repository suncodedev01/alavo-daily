import { useState } from 'react';

import { useT } from '@alavo-daily/common';
import { useToast } from '@alavo-daily/design-system';

import { useSyncController } from './useSyncController';

export type SyncAction = 'connect' | 'sync' | 'disconnect';

export interface SyncActions {
  /** False when this device cannot sign in to Google, so there is nothing to offer. */
  available: boolean;
  /** The action in progress, or null. */
  busy: SyncAction | null;
  connect(): void;
  syncNow(): void;
  disconnect(): void;
}

/** The sync buttons' behaviour: one action at a time, and a calm message when one fails. */
export function useSyncActions(): SyncActions {
  const t = useT();
  const { toast } = useToast();
  const controller = useSyncController();
  const [busy, setBusy] = useState<SyncAction | null>(null);

  const run = (action: SyncAction, work: () => Promise<void>, failure: string) => {
    if (busy) return;
    setBusy(action);
    work()
      .catch(() => toast(failure))
      .finally(() => setBusy(null));
  };

  return {
    available: controller !== null,
    busy,
    connect: () => {
      if (controller) run('connect', () => controller.connect(), t('Chưa đăng nhập được Google. Hãy thử lại.'));
    },
    syncNow: () => {
      if (controller) run('sync', () => controller.syncNow(), t('Chưa đồng bộ được. Hãy thử lại.'));
    },
    disconnect: () => {
      if (controller) run('disconnect', () => controller.disconnect(), t('Chưa ngắt kết nối được. Hãy thử lại.'));
    },
  };
}
