import { useT } from '@alavo-daily/common';
import { Card, IconTile, Segmented } from '@alavo-daily/design-system';

import { useSettings, useUpdateSettings } from '../../../hub-settings';

const CHOICES = [1, 5, 15, 30, 0] as const;

const DEFAULT_MINUTES = 5;

/** How often the app syncs by itself while it is open. 0 turns the timer off. */
export function SyncIntervalCard() {
  const t = useT();
  const settings = useSettings();
  const update = useUpdateSettings();
  const labelOf = (minutes: number) => (minutes === 0 ? t('Tắt') : t('{{count}} phút', { count: minutes }));
  const current = settings.data?.syncIntervalMinutes ?? DEFAULT_MINUTES;
  return (
    <Card padding="lg" className="grid gap-4">
      <div className="flex items-center gap-3">
        <IconTile icon="clock" />
        <div className="min-w-0 flex-1">
          <h2 className="text-title font-semibold">{t('Tự đồng bộ mỗi')}</h2>
          <p className="mt-1 text-sm text-text-muted">
            {t('Chỉ chạy khi ứng dụng đang mở. Mỗi lần bạn thay đổi dữ liệu, ứng dụng vẫn đồng bộ sau vài giây.')}
          </p>
        </div>
      </div>
      <Segmented
        label={t('Tự đồng bộ mỗi')}
        value={String(current)}
        onChange={(value) => update.mutate({ syncIntervalMinutes: Number(value) })}
        options={CHOICES.map((minutes) => ({ value: String(minutes), label: labelOf(minutes) }))}
        className="justify-self-start max-lg:justify-self-stretch"
      />
    </Card>
  );
}
