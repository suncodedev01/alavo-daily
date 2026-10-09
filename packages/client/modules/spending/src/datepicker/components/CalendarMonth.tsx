import { monthTitle } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { IconButton } from '@alavo-daily/design-system';
import { useEffect, useRef, type KeyboardEvent } from 'react';

import { CalendarDay } from './CalendarDay';
import { monthGrid, moveByKey, shiftMonthKeepingDay, WEEKDAY_LABELS } from '../logic/calendarGrid';

export interface CalendarMonthProps {
  cursor: string;
  selected: string;
  today: string;
  onCursorChange: (date: string) => void;
  onSelect: (date: string) => void;
}

export function CalendarMonth({ cursor, selected, today, onCursorChange, onSelect }: CalendarMonthProps) {
  const t = useT();
  const gridRef = useRef<HTMLDivElement>(null);
  const keyboardMoved = useRef(true);
  const month = cursor.slice(0, 7);

  useEffect(() => {
    if (!keyboardMoved.current) return;
    gridRef.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus();
  }, [cursor]);

  const handleKeyDown = (event: KeyboardEvent) => {
    const next = moveByKey(cursor, event.key);
    if (next === null) return;
    event.preventDefault();
    keyboardMoved.current = true;
    onCursorChange(next);
  };

  const shiftMonth = (delta: number) => {
    keyboardMoved.current = false;
    onCursorChange(shiftMonthKeepingDay(cursor, delta));
  };

  return (
    <div className="grid gap-2 p-2">
      <div className="flex items-center justify-between gap-1">
        <IconButton icon="caret-left" label={t('Tháng trước')} size="sm" onClick={() => shiftMonth(-1)} />
        <span aria-live="polite" className="text-sm font-semibold">
          {monthTitle(month)}
        </span>
        <IconButton icon="caret-right" label={t('Tháng sau')} size="sm" onClick={() => shiftMonth(1)} />
      </div>
      <div
        ref={gridRef}
        role="grid"
        aria-label={monthTitle(month)}
        onKeyDown={handleKeyDown}
        className="grid gap-1"
      >
        <div role="row" className="grid grid-cols-7 text-center">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} role="columnheader" className="py-1 text-meta font-semibold text-text-muted">
              {label}
            </span>
          ))}
        </div>
        {monthGrid(month).map((week) => (
          <div key={week.join('|')} role="row" className="grid grid-cols-7 justify-items-center">
            {week.map((date, index) =>
              date === null ? (
                <span key={`blank-${index}`} role="gridcell" />
              ) : (
                <CalendarDay
                  key={date}
                  date={date}
                  isCursor={date === cursor}
                  isSelected={date === selected}
                  isToday={date === today}
                  onSelect={onSelect}
                />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
