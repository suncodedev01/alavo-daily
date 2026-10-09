import { addMonths, monthTitle } from '@alavo-daily/common/format';
import { useLanguage, useT } from '@alavo-daily/common';
import { IconButton } from '@alavo-daily/design-system';

export interface MonthSwitcherProps {
  month: string;
  onChange: (month: string) => void;
}

export function MonthSwitcher({ month, onChange }: MonthSwitcherProps) {
  const language = useLanguage();
  const t = useT();
  return (
    <div role="group" aria-label={t('Chọn tháng')} className="flex items-center gap-1">
      <IconButton icon="caret-left" label={t('Tháng trước')} size="sm" onClick={() => onChange(addMonths(month, -1))} />
      <span aria-live="polite" className="min-w-28 text-center text-sm font-medium whitespace-nowrap">
        {monthTitle(month, language)}
      </span>
      <IconButton icon="caret-right" label={t('Tháng sau')} size="sm" onClick={() => onChange(addMonths(month, 1))} />
    </div>
  );
}
