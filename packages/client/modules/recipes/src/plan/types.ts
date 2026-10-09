import type { MealSlot, SuggestedEntry } from '@alavo-daily/common/engine';

export interface PlanTarget {
  date: string;
  slot: MealSlot;
}

export interface DishCount {
  name: string;
  count: number;
}

export interface SuggestionRange {
  from: string;
  days: number;
}

export interface SuggestedDay {
  date: string;
  entries: SuggestedEntry[];
}
