import { useT } from '@alavo-daily/common';
import type { ThemeSetting } from '@alavo-daily/common';
import { Card, IconTile, Segmented } from '@alavo-daily/design-system';

import { useSettings, useUpdateSettings } from '../../../hub-settings';

const THEMES: readonly ThemeSetting[] = ['light', 'dark', 'system'];

export function ThemeCard() {
  const t = useT();
  const settings = useSettings();
  const update = useUpdateSettings();
  const labels: Record<ThemeSetting, string> = {
    light: t('Nền sáng'),
    dark: t('Nền tối'),
    system: t('Theo thiết bị'),
  };
  return (
    <Card padding="lg" className="grid gap-4">
      <div className="flex items-center gap-3">
        <IconTile icon="moon" />
        <div className="min-w-0 flex-1">
          <h2 className="text-title font-semibold">{t('Giao diện')}</h2>
          <p className="mt-1 text-sm text-text-muted">{t('Chọn giao diện sáng, tối hoặc theo thiết bị.')}</p>
        </div>
      </div>
      <Segmented
        label={t('Giao diện')}
        value={settings.data?.theme ?? 'light'}
        onChange={(theme) => update.mutate({ theme: theme as ThemeSetting })}
        options={THEMES.map((theme) => ({ value: theme, label: labels[theme] }))}
        className="justify-self-start max-lg:justify-self-stretch"
      />
    </Card>
  );
}
