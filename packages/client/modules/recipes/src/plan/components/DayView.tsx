import type { PlanEntry, RecipeSummary } from '@alavo-daily/common/engine';
import { formatMinutes, formatVnd, weekdayShort } from '@alavo-daily/common/format';
import { useLanguage, useT } from '@alavo-daily/common';
import { Button, Card, cn, Eyebrow, Icon, IconTile } from '@alavo-daily/design-system';
import { useState } from 'react';

import { totalMinutes } from '../../recipe-math';
import { MEAL_SLOTS, SLOT_LABELS } from '../../vocabulary';
import { MealMenu } from './MealMenu';
import { dayOfMonth } from '../../week';
import { entriesAt, entryCost } from '../logic/planStatistics';
import type { PlanTarget } from '../types';

export interface DayViewProps {
  dates: readonly string[];
  entries: readonly PlanEntry[];
  recipes: readonly RecipeSummary[];
  today: string;
  onAdd: (target: PlanTarget) => void;
}

export function DayView({ dates, entries, recipes, today, onAdd }: DayViewProps) {
  const t = useT();
  const [chosen, setChosen] = useState<string | null>(null);
  const date = chosen !== null && dates.includes(chosen) ? chosen : dates.includes(today) ? today : (dates[0] ?? today);
  return (
    <div className="grid gap-4">
      <div role="group" aria-label={t('Chọn ngày')} className="grid grid-cols-7 gap-1">
        {dates.map((own) => (
          <DayButton key={own} date={own} selected={own === date} isToday={own === today} onChoose={setChosen} />
        ))}
      </div>
      {MEAL_SLOTS.map((slot) => (
        <Card key={slot} padding="sm" aria-label={t(SLOT_LABELS[slot])} className="grid gap-2">
          <Eyebrow>{t(SLOT_LABELS[slot])}</Eyebrow>
          <ul className="grid gap-1">
            {entriesAt(entries, date, slot).map((entry) => (
              <li key={entry.id}>
                <DishRow entry={entry} recipes={recipes} />
              </li>
            ))}
          </ul>
          <Button variant="outline" leadingIcon="plus" onClick={() => onAdd({ date, slot })}>
            {t('Thêm món')}
          </Button>
        </Card>
      ))}
    </div>
  );
}

interface DayButtonProps {
  date: string;
  selected: boolean;
  isToday: boolean;
  onChoose: (date: string) => void;
}

function DayButton({ date, selected, isToday, onChoose }: DayButtonProps) {
  const language = useLanguage();
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-current={isToday ? 'date' : undefined}
      onClick={() => onChoose(date)}
      className={cn(
        'focus-ring grid h-14 place-items-center rounded-lg bg-surface-tint text-xs font-semibold aria-pressed:bg-accent aria-pressed:text-accent-fg',
        isToday && 'inset-ring-2 inset-ring-ring',
      )}
    >
      {weekdayShort(date, language)}
      <span className="text-base">{dayOfMonth(date)}</span>
    </button>
  );
}

function DishRow({ entry, recipes }: { entry: PlanEntry; recipes: readonly RecipeSummary[] }) {
  const language = useLanguage();
  const recipe = recipes.find((own) => own.id === entry.recipeId);
  const cost = entryCost(entry, recipes);
  const meta = [recipe ? formatMinutes(totalMinutes(recipe), language) : null, cost > 0 ? formatVnd(cost) : null]
    .filter((part) => part !== null)
    .join(' · ');
  return (
    <MealMenu
      entry={entry}
      trigger={
        <button type="button" className="focus-ring flex min-h-14 w-full items-center gap-3 rounded-lg text-left">
          <IconTile icon={entry.recipeIcon} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{entry.recipeName}</span>
            <span className="block truncate text-xs text-text-muted">{meta}</span>
          </span>
          <Icon name="dots-three" size="lg" />
        </button>
      }
    />
  );
}
