import { addMonths, monthTitle } from '@alavo-daily/common/format';
import { useLanguage, useT } from '@alavo-daily/common';
import { IconButton, useLayout } from '@alavo-daily/design-system';

export interface MonthSwitcherProps {
  month: string;
  onChange: (month: string) => void;
}

export function MonthSwitcher({ month, onChange }: MonthSwitcherProps) {
  const language = useLanguage();
  const t = useT();
  const narrow = useLayout() === 'narrow';
  const label = narrow ? t('Tháng {{month}}', { month: Number(month.slice(5)) }) : monthTitle(month, language);
  return (
    <div role="group" aria-label={t('Chọn tháng')} className="flex items-center gap-1">
      <IconButton icon="caret-left" label={t('Tháng trước')} size="sm" onClick={() => onChange(addMonths(month, -1))} />
      <span aria-live="polite" className="min-w-20 text-center text-sm font-medium whitespace-nowrap lg:min-w-28">
        {label}
      </span>
      <IconButton icon="caret-right" label={t('Tháng sau')} size="sm" onClick={() => onChange(addMonths(month, 1))} />
    </div>
  );
}
