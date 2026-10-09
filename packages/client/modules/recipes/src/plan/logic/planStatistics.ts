import type { MealSlot, PlanEntry, RecipeSummary } from '@alavo-daily/common/engine';

import { costForServings } from '../../recipe-math';
import { MEAL_SLOTS, PLAN_DAYS } from '../../vocabulary';
import type { DishCount } from '../types';

export const TOTAL_SLOTS = PLAN_DAYS * MEAL_SLOTS.length;
const TOP_DISH_LIMIT = 4;

export function entriesAt(entries: readonly PlanEntry[], date: string, slot: MealSlot): PlanEntry[] {
  return entries.filter((entry) => entry.date === date && entry.slot === slot);
}

export function filledSlotCount(entries: readonly PlanEntry[]): number {
  return new Set(entries.map((entry) => `${entry.date}|${entry.slot}`)).size;
}

export function entryCost(entry: PlanEntry, recipes: readonly RecipeSummary[]): number {
  const recipe = recipes.find((own) => own.id === entry.recipeId);
  return recipe ? costForServings(recipe, entry.servings) : 0;
}

export function weekCost(entries: readonly PlanEntry[], recipes: readonly RecipeSummary[]): number {
  return entries.reduce((sum, entry) => sum + entryCost(entry, recipes), 0);
}

export function mostUsedDishes(entries: readonly PlanEntry[]): DishCount[] {
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.recipeName, (counts.get(entry.recipeName) ?? 0) + 1);
  return Array.from(counts, ([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, TOP_DISH_LIMIT);
}
