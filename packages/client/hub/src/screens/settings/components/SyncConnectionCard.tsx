import { useT, type SyncStatus } from '@alavo-daily/common';
import { Button, Card } from '@alavo-daily/design-system';

import { useSyncActions, type SyncActions } from '../../../sync-status';
import { CardIntro, WaitingChanges } from './CardIntro';
import { ConnectedCard } from './ConnectedCard';
import { SyncIntervalCard } from './SyncIntervalCard';

/** The Google connection card: whichever of the states below the sync is in. */
export function SyncConnectionCard({ status }: { status: SyncStatus | undefined }) {
  const actions = useSyncActions();
  const pending = status?.pendingEvents ?? 0;
  if (!actions.available) return <NotConfiguredCard pending={pending} />;
  if (!status || status.state === 'off') return <NotConnectedCard actions={actions} pending={pending} />;
  if (status.state === 'needs_login') return <NeedsLoginCard actions={actions} pending={pending} />;
  return (
    <>
      <ConnectedCard status={status} actions={actions} />
      <SyncIntervalCard />
    </>
  );
}

function NotConfiguredCard({ pending }: { pending: number }) {
  const t = useT();
  return (
    <Card padding="lg" className="grid gap-4">
      <CardIntro
        icon="cloud-slash"
        title={t('Chưa cấu hình đăng nhập Google')}
        body={t(
          'Bản này chưa có thông tin đăng nhập Google nên chưa đồng bộ được. Dữ liệu vẫn lưu trên máy này, bạn có thể xuất ra tệp để giữ một bản sao.',
        )}
      />
      <WaitingChanges pending={pending} />
    </Card>
  );
}

function NotConnectedCard({ actions, pending }: { actions: SyncActions; pending: number }) {
  const t = useT();
  return (
    <Card padding="lg" className="grid gap-6">
      <CardIntro
        icon="cloud-slash"
        title={t('Dữ liệu đang chỉ nằm trên máy này')}
        body={t('Nếu xoá dữ liệu trên máy hoặc đổi máy, bạn sẽ mất dữ liệu chưa xuất ra.')}
      />
      <p className="text-sm text-text-secondary">
        {t(
          'Kết nối Google sẽ cho phép sao lưu và dùng cùng một dữ liệu trên nhiều thiết bị. Alavo Daily không có máy chủ riêng, dữ liệu được lưu trong Google Drive của chính bạn.',
        )}
      </p>
      <Button
        size="lg"
        leadingIcon="google-logo"
        disabled={actions.busy !== null}
        onClick={actions.connect}
        className="justify-self-start"
      >
        {t('Kết nối với Google')}
      </Button>
      <WaitingChanges pending={pending} />
    </Card>
  );
}

function NeedsLoginCard({ actions, pending }: { actions: SyncActions; pending: number }) {
  const t = useT();
  return (
    <Card padding="lg" className="grid gap-4">
      <CardIntro
        icon="cloud-slash"
        title={t('Cần đăng nhập lại Google')}
        body={t(
          'Phiên đăng nhập Google đã hết hạn. Dữ liệu trên máy này vẫn an toàn, các thay đổi sẽ được gửi đi sau khi bạn đăng nhập lại.',
        )}
      />
      <div className="flex flex-wrap gap-2">
        <Button leadingIcon="google-logo" disabled={actions.busy !== null} onClick={actions.connect}>
          {t('Đăng nhập lại Google')}
        </Button>
        <Button variant="ghost" disabled={actions.busy !== null} onClick={actions.disconnect}>
          {t('Ngắt kết nối')}
        </Button>
      </div>
      <WaitingChanges pending={pending} />
    </Card>
  );
}
