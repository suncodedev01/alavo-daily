import { relativeDayLabel } from '@alavo-daily/common/format';
import { useLanguage, useT, type Language } from '@alavo-daily/common';
import { Button, Icon, Popover } from '@alavo-daily/design-system';
import { useState } from 'react';

import { CalendarMonth } from './CalendarMonth';

export interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  today: string;
  label: string;
  invalid?: boolean;
}

const TRIGGER_CLASS =
  'focus-ring flex h-9 w-full items-center gap-2 rounded-4xl bg-surface px-3 text-left text-sm text-text-primary inset-ring inset-ring-line-hairline aria-expanded:inset-ring-2 aria-expanded:inset-ring-ring max-lg:h-12 max-lg:px-4 max-lg:text-base';

function triggerText(value: string, today: string, language: Language): string {
  const base = relativeDayLabel(value, today, language);
  if (value.slice(0, 4) === today.slice(0, 4)) return base;
  return `${base}${language === 'en' ? ', ' : '/'}${value.slice(0, 4)}`;
}

export function DatePicker({ value, onChange, today, label, invalid }: DatePickerProps) {
  const t = useT();
  const language = useLanguage();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(value);

  const choose = (date: string) => {
    onChange(date);
    setOpen(false);
  };

  const trigger = (
    <button
      type="button"
      aria-label={`${label}: ${triggerText(value, today, language)}`}
      aria-invalid={invalid || undefined}
      className={TRIGGER_CLASS}
      onClick={() => setCursor(value)}
    >
      <Icon name="calendar-blank" size="lg" className="text-text-muted" />
      <span className="min-w-0 flex-1 truncate">{triggerText(value, today, language)}</span>
      <Icon name="caret-down" className="text-text-muted" />
    </button>
  );

  return (
    <Popover trigger={trigger} open={open} onOpenChange={setOpen} label={t('Chọn ngày')} align="end">
      <CalendarMonth cursor={cursor} selected={value} today={today} onCursorChange={setCursor} onSelect={choose} />
      <div className="flex justify-end border-t border-line-hairline p-1">
        <Button variant="ghost" size="sm" onClick={() => choose(today)}>
          {t('Hôm nay')}
        </Button>
      </div>
    </Popover>
  );
}
