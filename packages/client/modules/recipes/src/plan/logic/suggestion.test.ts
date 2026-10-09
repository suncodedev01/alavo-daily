import type { SuggestedEntry } from '@alavo-daily/common/engine';
import { describe, expect, it } from 'vitest';

import {
  daysBetween,
  entryKey,
  groupByDay,
  othersOf,
  removeEntry,
  replaceEntry,
  suggestionRange,
  toggleSlot,
} from './suggestion';

function entry(date: string, slot: SuggestedEntry['slot'], recipeId: string): SuggestedEntry {
  return { date, slot, recipeId, recipeName: `Món ${recipeId}`, recipeIcon: 'cooking-pot' };
}

describe('suggestionRange', () => {
  it('starts today when the shown week is under way', () => {
    expect(suggestionRange('2026-10-05', '2026-10-09')).toEqual({ from: '2026-10-09', days: 3 });
  });

  it('covers the whole week when today is its first or last day', () => {
    expect(suggestionRange('2026-10-05', '2026-10-05')).toEqual({ from: '2026-10-05', days: 7 });
    expect(suggestionRange('2026-10-05', '2026-10-11')).toEqual({ from: '2026-10-11', days: 1 });
  });

  it('covers a whole future week', () => {
    expect(suggestionRange('2026-10-12', '2026-10-09')).toEqual({ from: '2026-10-12', days: 7 });
  });

  it('falls back to the whole week when it is already over', () => {
    expect(suggestionRange('2026-09-28', '2026-10-09')).toEqual({ from: '2026-09-28', days: 7 });
  });
});

describe('daysBetween', () => {
  it('counts calendar days across a month end and a clock change', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-09', '2026-10-09')).toBe(0);
  });
});

describe('toggleSlot', () => {
  it('adds a slot and keeps the meals in order', () => {
    expect(toggleSlot(['dinner'], 'breakfast')).toEqual(['breakfast', 'dinner']);
    expect(toggleSlot(['lunch', 'dinner'], 'breakfast')).toEqual(['breakfast', 'lunch', 'dinner']);
  });

  it('removes a slot', () => {
    expect(toggleSlot(['lunch', 'dinner'], 'lunch')).toEqual(['dinner']);
  });

  it('never leaves no slot', () => {
    expect(toggleSlot(['dinner'], 'dinner')).toEqual(['dinner']);
  });
});

describe('proposal editing', () => {
  const lunch = entry('2026-10-09', 'lunch', 'a');
  const dinner = entry('2026-10-09', 'dinner', 'b');
  const next = entry('2026-10-10', 'dinner', 'c');

  it('groups the entries by day keeping their order', () => {
    expect(groupByDay([lunch, dinner, next])).toEqual([
      { date: '2026-10-09', entries: [lunch, dinner] },
      { date: '2026-10-10', entries: [next] },
    ]);
    expect(groupByDay([])).toEqual([]);
  });

  it('identifies an entry by its date and meal', () => {
    expect(entryKey(lunch)).toBe('2026-10-09|lunch');
  });

  it('replaces only the entry of that meal', () => {
    const other = entry('2026-10-09', 'lunch', 'z');
    expect(replaceEntry([lunch, dinner, next], lunch, other)).toEqual([other, dinner, next]);
  });

  it('keeps the list when there is no other dish to put in', () => {
    expect(replaceEntry([lunch, dinner], lunch, undefined)).toEqual([lunch, dinner]);
  });

  it('removes one entry', () => {
    expect(removeEntry([lunch, dinner, next], dinner)).toEqual([lunch, next]);
  });

  it('lists the other entries for the engine without the names', () => {
    expect(othersOf([lunch, dinner], lunch)).toEqual([{ date: '2026-10-09', slot: 'dinner', recipeId: 'b' }]);
  });
});
