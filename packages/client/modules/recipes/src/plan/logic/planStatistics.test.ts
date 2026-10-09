import type { PlanEntry } from '@alavo-daily/common/engine';
import { describe, expect, it } from 'vitest';

import { ALL_RECIPES, summaryOf } from '../../testing/fixtures';
import { entriesAt, entryCost, filledSlotCount, mostUsedDishes, weekCost } from './planStatistics';

function entry(id: string, date: string, slot: PlanEntry['slot'], recipeId: string, servings = 2): PlanEntry {
  const name = ALL_RECIPES.find((recipe) => recipe.id === recipeId)?.name ?? recipeId;
  return { id, date, slot, recipeId, recipeName: name, recipeIcon: 'cooking-pot', servings };
}

const entries = [
  entry('1', '2026-10-05', 'lunch', 'ga-kho'),
  entry('2', '2026-10-05', 'lunch', 'canh-chua'),
  entry('3', '2026-10-06', 'dinner', 'ga-kho', 4),
];
const summaries = ALL_RECIPES.map(summaryOf);

describe('plan statistics', () => {
  it('finds the entries of one slot', () => {
    expect(entriesAt(entries, '2026-10-05', 'lunch')).toHaveLength(2);
    expect(entriesAt(entries, '2026-10-05', 'dinner')).toHaveLength(0);
  });

  it('counts a slot once however many dishes it holds', () => {
    expect(filledSlotCount(entries)).toBe(2);
  });

  it('prices an entry by its own servings', () => {
    expect(entryCost(entries[2]!, summaries)).toBe(61000);
    expect(entryCost(entries[0]!, summaries)).toBe(30500);
  });

  it('prices an entry of an unknown recipe at zero', () => {
    expect(entryCost(entry('9', '2026-10-05', 'lunch', 'gone'), summaries)).toBe(0);
  });

  it('adds up the week', () => {
    expect(weekCost(entries, summaries)).toBe(30500 + 43500 + 61000);
  });

  it('ranks dishes by count then name', () => {
    expect(mostUsedDishes(entries)).toEqual([
      { name: 'Gà kho gừng', count: 2 },
      { name: 'Canh chua cá lóc', count: 1 },
    ]);
  });
});
