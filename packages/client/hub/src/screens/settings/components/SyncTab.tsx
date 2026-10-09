import { useEngine, useEngineMutation, useEngineQuery, usePlatform, useT } from '@alavo-daily/common';
import { Button, Card, ContextSection, Icon, IconTile, useToast } from '@alavo-daily/design-system';

import { todayText } from '../../../clock';

export function SyncTab() {
  const t = useT();
  const status = useEngineQuery('sync.status');
  const pending = status.data?.pendingEvents ?? 0;
  return (
    <>
      <Card padding="lg" className="grid gap-6">
        <div className="flex items-center gap-4">
          <IconTile icon="cloud-slash" size="lg" />
          <div>
            <h2 className="text-title font-semibold">{t('Dữ liệu đang chỉ nằm trên máy này')}</h2>
            <p className="mt-1 text-sm text-text-muted">
              {t('Nếu xoá dữ liệu trình duyệt hoặc đổi máy, bạn sẽ mất dữ liệu chưa xuất ra.')}
            </p>
          </div>
        </div>
        <p className="text-sm text-text-secondary">
          {t(
            'Kết nối Google sẽ cho phép sao lưu và dùng cùng một dữ liệu trên nhiều thiết bị. Alavo Daily không có máy chủ riêng, dữ liệu được lưu trong Google Drive của chính bạn.',
          )}
        </p>
        <div className="grid justify-items-start gap-2">
          <Button size="lg" leadingIcon="google-logo" disabled>
            {t('Kết nối với Google')}
          </Button>
          <p className="text-xs text-text-muted">{t('Sắp có. Tính năng này chưa dùng được ở bản hiện tại.')}</p>
        </div>
        <p className="text-sm text-text-secondary">
          {t('{{count}} thay đổi trên máy này chưa được đồng bộ', { count: pending })}
        </p>
      </Card>
      <LocalDataCard />
    </>
  );
}

function LocalDataCard() {
  const t = useT();
  const engine = useEngine();
  const platform = usePlatform();
  const { toast } = useToast();
  const loadDemo = useEngineMutation('hub.load_demo_data');
  const exportData = async () => {
    const data = await engine.call('hub.export_data');
    await platform.saveTextFile(`alavo-daily-${todayText()}.json`, JSON.stringify(data, null, 2));
    toast(t('Đã xuất dữ liệu'));
  };
  const exportAndReport = () => exportData().catch(() => toast(t('Không xuất được dữ liệu')));
  return (
    <Card padding="lg" className="grid gap-4">
      <div>
        <h2 className="text-title font-semibold">{t('Dữ liệu trên máy này')}</h2>
        <p className="mt-1 text-sm text-text-muted">
          {t('Xuất ra một tệp để tự lưu giữ, hoặc nạp dữ liệu mẫu để thử ứng dụng.')}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" leadingIcon="export" onClick={exportAndReport}>
          {t('Xuất dữ liệu')}
        </Button>
        <Button
          variant="outline"
          leadingIcon="download-simple"
          disabled={loadDemo.isPending}
          onClick={() => loadDemo.mutate(undefined, { onSuccess: () => toast(t('Đã nạp dữ liệu mẫu')) })}
        >
          {t('Nạp dữ liệu mẫu')}
        </Button>
      </div>
    </Card>
  );
}

export function SyncDock() {
  const t = useT();
  const status = useEngineQuery('sync.status');
  return (
    <>
      <ContextSection title={t('Dữ liệu lưu ở đâu')} defaultOpen>
        <p className="text-sm text-text-secondary">
          {t(
            'Hiện toàn bộ dữ liệu nằm trong bộ nhớ riêng của ứng dụng trên máy này. Không có máy chủ của Alavo Daily nào giữ bản sao.',
          )}
        </p>
      </ContextSection>
      <ContextSection title={t('Thiết bị')} defaultOpen>
        <div className="flex items-center gap-3">
          <Icon name="desktop" size="lg" className="text-text-secondary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t('Máy này')}</p>
            <p className="truncate text-xs text-text-muted">{status.data?.deviceId ?? ''}</p>
          </div>
        </div>
      </ContextSection>
    </>
  );
}
