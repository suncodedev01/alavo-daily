import { useLanguage, useT } from '@alavo-daily/common';
import { Card, IconTile, OptionPicker, type PickerOption } from '@alavo-daily/design-system';

import { useUpdateSettings } from '../../../hub-settings';

const LANGUAGE_OPTIONS: readonly PickerOption[] = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
];

export function LanguageCard() {
  const t = useT();
  const language = useLanguage();
  const update = useUpdateSettings();
  return (
    <Card padding="lg" className="flex items-center gap-3">
      <IconTile icon="globe" />
      <div className="min-w-0 flex-1">
        <h2 className="text-title font-semibold">{t('Ngôn ngữ')}</h2>
        <p className="mt-1 text-sm text-text-muted">{t('Ngôn ngữ hiển thị của ứng dụng.')}</p>
      </div>
      <OptionPicker
        className="w-40 shrink-0"
        align="end"
        label={t('Ngôn ngữ')}
        value={language}
        options={LANGUAGE_OPTIONS}
        onChange={(next) => update.mutate({ language: next })}
      />
    </Card>
  );
}
