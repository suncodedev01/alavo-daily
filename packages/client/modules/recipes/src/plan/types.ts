import type { MealSlot } from '@alavo-daily/common/engine';

export interface PlanTarget {
  date: string;
  slot: MealSlot;
}

export interface DishCount {
  name: string;
  count: number;
}
