import { useLanguage } from '@alavo-daily/common';
import { dateWithYear } from '@alavo-daily/common/format';

export interface CalendarDayProps {
  date: string;
  isCursor: boolean;
  isSelected: boolean;
  isToday: boolean;
  onSelect: (date: string) => void;
}

const DAY_CLASS =
  'focus-ring grid size-9 place-items-center rounded-full text-sm text-text-primary hover:bg-surface-tint max-lg:size-11 data-selected:bg-primary data-selected:text-primary-fg data-selected:hover:bg-primary-hover data-today:font-semibold data-today:inset-ring data-today:inset-ring-line-strong';

export function CalendarDay({ date, isCursor, isSelected, isToday, onSelect }: CalendarDayProps) {
  const language = useLanguage();
  return (
    <span role="gridcell" aria-selected={isSelected}>
      <button
        type="button"
        tabIndex={isCursor ? 0 : -1}
        aria-label={dateWithYear(date, language)}
        aria-current={isToday ? 'date' : undefined}
        data-selected={isSelected ? '' : undefined}
        data-today={isToday ? '' : undefined}
        className={DAY_CLASS}
        onClick={() => onSelect(date)}
      >
        {Number(date.slice(8))}
      </button>
    </span>
  );
}
