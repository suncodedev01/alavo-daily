import type { PlanEntry } from '@alavo-daily/common/engine';
import { weekdayShort } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { cn, IconButton } from '@alavo-daily/design-system';

import { MEAL_SLOTS, SLOT_LABELS } from '../../vocabulary';
import { MealMenu } from './MealMenu';
import { dayOfMonth } from '../../week';
import { entriesAt } from '../logic/planStatistics';
import type { PlanTarget } from '../types';

export interface WeekGridProps {
  dates: readonly string[];
  entries: readonly PlanEntry[];
  today: string;
  onAdd: (target: PlanTarget) => void;
}

export function WeekGrid({ dates, entries, today, onAdd }: WeekGridProps) {
  const t = useT();
  return (
    <div className="overflow-x-auto rounded-xl bg-surface p-3 shadow-card">
      <table aria-label={t('Thực đơn cả tuần')} className="w-full min-w-160 table-fixed border-separate border-spacing-1">
        <colgroup>
          <col className="w-16" />
          {dates.map((date) => (
            <col key={date} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <td />
            {dates.map((date) => (
              <DayHeader key={date} date={date} isToday={date === today} />
            ))}
          </tr>
        </thead>
        <tbody>
          {MEAL_SLOTS.map((slot) => (
            <tr key={slot}>
              <th scope="row" className="eyebrow pt-2 text-left align-top">
                {t(SLOT_LABELS[slot])}
              </th>
              {dates.map((date) => (
                <SlotCell
                  key={date}
                  target={{ date, slot }}
                  entries={entriesAt(entries, date, slot)}
                  isPast={date < today}
                  onAdd={onAdd}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DayHeader({ date, isToday }: { date: string; isToday: boolean }) {
  return (
    <th
      scope="col"
      aria-current={isToday ? 'date' : undefined}
      className={cn('rounded-lg py-1.5 text-center', isToday && 'bg-accent text-accent-fg')}
    >
      <div className="text-xs font-semibold">{weekdayShort(date)}</div>
      <div className="text-base font-semibold">{dayOfMonth(date)}</div>
    </th>
  );
}

interface SlotCellProps {
  target: PlanTarget;
  entries: readonly PlanEntry[];
  isPast: boolean;
  onAdd: (target: PlanTarget) => void;
}

function SlotCell({ target, entries, isPast, onAdd }: SlotCellProps) {
  const t = useT();
  return (
    <td className="overflow-hidden rounded-lg bg-surface-raised p-1 align-top">
      <ul className="grid gap-1">
        {entries.map((entry) => (
          <li key={entry.id}>
            <MealMenu entry={entry} trigger={mealChipButton(entry.recipeName, isPast)} />
          </li>
        ))}
      </ul>
      <IconButton
        icon="plus"
        size="sm"
        label={t('Thêm món {{day}}, bữa {{slot}}', {
          day: `${weekdayShort(target.date)} ${dayOfMonth(target.date)}`,
          slot: t(SLOT_LABELS[target.slot]),
        })}
        onClick={() => onAdd(target)}
      />
    </td>
  );
}

function mealChipButton(name: string, isPast: boolean) {
  return (
    <button
      type="button"
      className={cn(
        'focus-ring block w-full rounded-md px-2 py-1 text-left text-xs font-medium break-words',
        isPast ? 'bg-surface-tint text-text-muted' : 'bg-accent text-accent-fg',
      )}
    >
      {name}
    </button>
  );
}
