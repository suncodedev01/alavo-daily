import type { MealSlot, SuggestedEntry } from '@alavo-daily/common/engine';
import { addDays, parseDateText } from '@alavo-daily/common/format';

import { MEAL_SLOTS, PLAN_DAYS } from '../../vocabulary';
import type { SuggestedDay, SuggestionRange } from '../types';

export const DEFAULT_SUGGESTED_SLOTS: readonly MealSlot[] = ['lunch', 'dinner'];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** From today when the shown week is under way, otherwise from its first day, to its last day. */
export function suggestionRange(weekStart: string, today: string): SuggestionRange {
  const lastDay = addDays(weekStart, PLAN_DAYS - 1);
  const from = today > weekStart && today <= lastDay ? today : weekStart;
  return { from, days: daysBetween(from, lastDay) + 1 };
}

export function daysBetween(first: string, last: string): number {
  const apart = parseDateText(last).getTime() - parseDateText(first).getTime();
  return Math.round(apart / MS_PER_DAY);
}

export function entryKey(entry: Pick<SuggestedEntry, 'date' | 'slot'>): string {
  return `${entry.date}|${entry.slot}`;
}

/** Adds or removes `slot`, always keeping at least one, in breakfast, lunch, dinner order. */
export function toggleSlot(slots: readonly MealSlot[], slot: MealSlot): MealSlot[] {
  const next = slots.includes(slot) ? slots.filter((own) => own !== slot) : [...slots, slot];
  if (next.length === 0) return [...slots];
  return MEAL_SLOTS.filter((own) => next.includes(own));
}

export function groupByDay(entries: readonly SuggestedEntry[]): SuggestedDay[] {
  const days: SuggestedDay[] = [];
  for (const entry of entries) {
    const day = days.find((own) => own.date === entry.date);
    if (day) day.entries.push(entry);
    else days.push({ date: entry.date, entries: [entry] });
  }
  return days;
}

/** Puts `replacement` where `target` was. Nothing changes when the engine found nothing else. */
export function replaceEntry(
  entries: readonly SuggestedEntry[],
  target: SuggestedEntry,
  replacement: SuggestedEntry | undefined,
): SuggestedEntry[] {
  if (replacement === undefined) return [...entries];
  return entries.map((own) => (entryKey(own) === entryKey(target) ? replacement : own));
}

export function removeEntry(entries: readonly SuggestedEntry[], target: SuggestedEntry): SuggestedEntry[] {
  return entries.filter((own) => entryKey(own) !== entryKey(target));
}

/** The other proposed meals, which the engine counts for spacing and variety. */
export function othersOf(entries: readonly SuggestedEntry[], target: SuggestedEntry) {
  return removeEntry(entries, target).map(({ date, slot, recipeId }) => ({ date, slot, recipeId }));
}
