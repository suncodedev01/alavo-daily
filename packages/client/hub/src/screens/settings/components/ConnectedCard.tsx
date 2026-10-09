import { useState } from 'react';

import { useT, type SyncStatus } from '@alavo-daily/common';
import { Button, Card, ConfirmDialog } from '@alavo-daily/design-system';

import { describeSyncError, type SyncActions } from '../../../sync-status';
import { formatLastSync } from '../../../sync-status/logic/formatLastSync';
import { CardIntro } from './CardIntro';

interface ConnectedCardProps {
  status: SyncStatus;
  actions: SyncActions;
}

export function ConnectedCard({ status, actions }: ConnectedCardProps) {
  const t = useT();
  const failed = status.state === 'error';
  return (
    <Card padding="lg" className="grid gap-4">
      <CardIntro icon={iconOf(status)} title={titleOf(status, t)} body={bodyOf(status, t)} />
      <ConnectionFacts status={status} />
      {failed ? <p role="alert" className="text-sm text-destructive-fg">{describeSyncError(status.error, t)}</p> : null}
      {status.state === 'offline' ? <OfflineNote /> : null}
      <ConnectedActions status={status} actions={actions} />
    </Card>
  );
}

function ConnectionFacts({ status }: { status: SyncStatus }) {
  const t = useT();
  return (
    <dl className="grid gap-2 text-sm">
      <Fact label={t('Tài khoản Google')} value={status.accountEmail ?? t('Đã kết nối')} />
      <Fact
        label={t('Lần đồng bộ gần nhất')}
        value={status.lastSyncedAt === null ? t('Chưa có') : formatLastSync(status.lastSyncedAt, t)}
      />
      <Fact label={t('Thay đổi đang chờ gửi')} value={String(status.pendingEvents)} />
    </dl>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd className="min-w-0 truncate font-medium">{value}</dd>
    </div>
  );
}

function OfflineNote() {
  const t = useT();
  return (
    <p role="note" className="rounded-lg bg-surface-tint p-3 text-sm text-text-secondary">
      {t('Không có mạng. Các thay đổi được giữ lại trên máy và gửi đi khi có mạng.')}
    </p>
  );
}

function ConnectedActions({ status, actions }: ConnectedCardProps) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const working = status.state === 'syncing' || actions.busy !== null;
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" leadingIcon="arrows-clockwise" disabled={working} onClick={actions.syncNow}>
        {status.state === 'error' ? t('Thử lại') : t('Đồng bộ ngay')}
      </Button>
      <Button variant="ghost" disabled={actions.busy !== null} onClick={() => setConfirming(true)}>
        {t('Ngắt kết nối')}
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('Ngắt kết nối với Google?')}
        description={t(
          'Việc này chỉ dừng đồng bộ. Dữ liệu trên máy này và thư mục sao lưu trong Google Drive của bạn được giữ nguyên.',
        )}
        confirmLabel={t('Ngắt kết nối')}
        cancelLabel={t('Huỷ')}
        onConfirm={actions.disconnect}
      />
    </div>
  );
}

function iconOf(status: SyncStatus): string {
  if (status.state === 'error') return 'warning';
  return status.state === 'offline' ? 'cloud-slash' : 'cloud-check';
}

function titleOf(status: SyncStatus, t: ReturnType<typeof useT>): string {
  switch (status.state) {
    case 'syncing':
      return t('Đang đồng bộ…');
    case 'offline':
      return t('Đang ngoại tuyến');
    case 'error':
      return t('Đồng bộ chưa thành công');
    default:
      return t('Đã kết nối với Google');
  }
}

function bodyOf(status: SyncStatus, t: ReturnType<typeof useT>): string {
  if (status.state === 'syncing') return t('Đừng đóng ứng dụng cho đến khi xong.');
  return t('Dữ liệu được sao lưu và dùng chung trong Google Drive của chính bạn.');
}
