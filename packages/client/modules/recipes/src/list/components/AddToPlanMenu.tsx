import { useEngineMutation, type MealSlot } from '@alavo-daily/common/engine';
import { addDays, relativeDayLabel } from '@alavo-daily/common/format';
import { useLanguage, useT } from '@alavo-daily/common';
import { Button, Pill, Popover, useToast } from '@alavo-daily/design-system';
import { useState } from 'react';

import { useReportError } from '../../engine-errors';
import { useToday } from '../../today';
import { MEAL_SLOTS, PLAN_DAYS, SLOT_LABELS } from '../../vocabulary';

export interface AddToPlanMenuProps {
  recipeId: string;
  recipeName: string;
  servings: number;
}

export function AddToPlanMenu({ recipeId, recipeName, servings }: AddToPlanMenuProps) {
  const language = useLanguage();
  const t = useT();
  const today = useToday();
  const { toast } = useToast();
  const reportError = useReportError();
  const [open, setOpen] = useState(false);
  const addToPlan = useEngineMutation('recipes.add_to_plan');
  const days = Array.from({ length: PLAN_DAYS }, (_, offset) => addDays(today, offset));
  const choose = (date: string, slot: MealSlot) =>
    addToPlan.mutate(
      { date, slot, recipeId, servings },
      {
        onSuccess: () => {
          toast(
            t('Đã thêm {{name}} vào {{day}}, bữa {{slot}}', {
              name: recipeName,
              day: relativeDayLabel(date, today, language),
              slot: t(SLOT_LABELS[slot]),
            }),
          );
          setOpen(false);
        },
        onError: reportError,
      },
    );
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label={t('Chọn ngày và bữa')}
      trigger={
        <Button variant="outline" leadingIcon="calendar-blank">
          {t('Thêm vào thực đơn')}
        </Button>
      }
    >
      <ul className="grid gap-1 p-1">
        {days.map((date) => (
          <li key={date} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 text-sm">{relativeDayLabel(date, today, language)}</span>
            {MEAL_SLOTS.map((slot) => (
              <Pill
                key={slot}
                aria-label={`${relativeDayLabel(date, today, language)}, ${t(SLOT_LABELS[slot])}`}
                onClick={() => choose(date, slot)}
              >
                {t(SLOT_LABELS[slot])}
              </Pill>
            ))}
          </li>
        ))}
      </ul>
    </Popover>
  );
}
