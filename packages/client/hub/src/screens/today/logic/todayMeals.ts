import type { PlanEntry } from '@alavo-daily/common';

export type MealSlot = PlanEntry['slot'];
export type MealsTitle = 'day' | 'fromLunch' | 'tonight';

export interface MealGroup {
  slot: MealSlot;
  entries: PlanEntry[];
}

export type TodayMeals =
  | { kind: 'planned'; title: MealsTitle; showSlotLabels: boolean; groups: MealGroup[] }
  | { kind: 'done'; mealCount: number }
  | { kind: 'empty' };

export const LUNCH_FROM_HOUR = 10;
export const DINNER_FROM_HOUR = 15;
const HOURS_PER_DAY = 24;
const MEAL_SLOTS: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner'];

/** Shows the meals still ahead at `hour` (local, 0 to 23); `plan` holds the entries of one day. */
export function todayMeals(plan: PlanEntry[], hour: number): TodayMeals {
  const planned = groupBySlot(plan);
  if (planned.length === 0) return { kind: 'empty' };
  const ahead = slotsAhead(hour);
  const groups = planned.filter((group) => ahead.includes(group.slot));
  if (groups.length === 0) return { kind: 'done', mealCount: planned.length };
  const title = titleFor(hour, groups);
  return { kind: 'planned', title, showSlotLabels: title !== 'tonight', groups };
}

export function mealEntries(groups: MealGroup[]): PlanEntry[] {
  return groups.flatMap((group) => group.entries);
}

/** Milliseconds from `now` to the next moment `todayMeals` can change its answer. */
export function millisUntilNextMealWindow(now: Date): number {
  const nextHour = [LUNCH_FROM_HOUR, DINNER_FROM_HOUR, HOURS_PER_DAY].find((hour) => hour > now.getHours());
  const boundary = new Date(now);
  boundary.setHours(nextHour ?? HOURS_PER_DAY, 0, 0, 0);
  return boundary.getTime() - now.getTime();
}

function groupBySlot(plan: PlanEntry[]): MealGroup[] {
  return MEAL_SLOTS.map((slot) => ({ slot, entries: plan.filter((entry) => entry.slot === slot) })).filter(
    (group) => group.entries.length > 0,
  );
}

function slotsAhead(hour: number): readonly MealSlot[] {
  if (hour < LUNCH_FROM_HOUR) return MEAL_SLOTS;
  return hour < DINNER_FROM_HOUR ? MEAL_SLOTS.slice(1) : MEAL_SLOTS.slice(2);
}

function titleFor(hour: number, groups: MealGroup[]): MealsTitle {
  if (hour < LUNCH_FROM_HOUR) return 'day';
  return hour < DINNER_FROM_HOUR && groups[0]?.slot === 'lunch' ? 'fromLunch' : 'tonight';
}
