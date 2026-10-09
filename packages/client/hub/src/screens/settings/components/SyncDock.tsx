import { useEngineQuery, useT } from '@alavo-daily/common';
import { ContextSection, Icon } from '@alavo-daily/design-system';

export function SyncDock() {
  const t = useT();
  const status = useEngineQuery('sync.status');
  const connected = status.data !== undefined && status.data.state !== 'off';
  return (
    <>
      <ContextSection title={t('Dữ liệu lưu ở đâu')} defaultOpen>
        <p className="text-sm text-text-secondary">
          {connected
            ? t(
                'Dữ liệu nằm trong bộ nhớ riêng của ứng dụng trên máy này và được sao lưu vào thư mục "Alavo Daily Backup" trong Google Drive của bạn. Không có máy chủ của Alavo Daily nào giữ bản sao.',
              )
            : t(
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
