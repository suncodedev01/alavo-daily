import { describe, expect, it } from 'vitest';

import { aMeal } from '../../../testing/hubEngine';
import { mealEntries, millisUntilNextMealWindow, todayMeals } from './todayMeals';

const breakfast = aMeal('breakfast', 'Bánh mì');
const lunch = aMeal('lunch', 'Cơm tấm');
const dinner = aMeal('dinner', 'Gà kho gừng');
const fullDay = [dinner, breakfast, lunch];

function plannedSlots(plan: Parameters<typeof todayMeals>[0], hour: number): string[] {
  const meals = todayMeals(plan, hour);
  return meals.kind === 'planned' ? meals.groups.map((group) => group.slot) : [];
}

describe('before 10:00', () => {
  it('lists every planned slot of the day in order', () => {
    expect(todayMeals(fullDay, 9)).toMatchObject({ kind: 'planned', title: 'day', showSlotLabels: true });
    expect(plannedSlots(fullDay, 9)).toEqual(['breakfast', 'lunch', 'dinner']);
  });

  it('shows only dinner when only dinner is planned', () => {
    expect(plannedSlots([dinner], 7)).toEqual(['dinner']);
    expect(todayMeals([dinner], 7)).toMatchObject({ title: 'day' });
  });

  it('skips the slots that have no dish', () => {
    expect(plannedSlots([lunch, dinner], 6)).toEqual(['lunch', 'dinner']);
  });

  it('keeps several dishes of one slot together in plan order', () => {
    const soup = aMeal('dinner', 'Canh chua');
    const meals = todayMeals([dinner, soup], 8);
    expect(meals.kind === 'planned' && mealEntries(meals.groups).map((entry) => entry.recipeName)).toEqual([
      'Gà kho gừng',
      'Canh chua',
    ]);
  });
});

describe('from 10:00 to 14:59', () => {
  it('drops breakfast at 10:00 and starts from lunch', () => {
    expect(todayMeals(fullDay, 10)).toMatchObject({ kind: 'planned', title: 'fromLunch', showSlotLabels: true });
    expect(plannedSlots(fullDay, 10)).toEqual(['lunch', 'dinner']);
  });

  it('still shows lunch and dinner at 14:59', () => {
    expect(plannedSlots(fullDay, 14)).toEqual(['lunch', 'dinner']);
  });

  it('is titled after dinner when lunch has no dish', () => {
    expect(todayMeals([breakfast, dinner], 12)).toMatchObject({ title: 'tonight', showSlotLabels: false });
    expect(plannedSlots([breakfast, dinner], 12)).toEqual(['dinner']);
  });
});

describe('from 15:00', () => {
  it('shows only dinner, titled tonight, with no slot labels', () => {
    expect(todayMeals(fullDay, 15)).toMatchObject({ kind: 'planned', title: 'tonight', showSlotLabels: false });
    expect(plannedSlots(fullDay, 15)).toEqual(['dinner']);
    expect(plannedSlots(fullDay, 23)).toEqual(['dinner']);
  });

  it('is done and counts the planned meals when dinner has no dish', () => {
    expect(todayMeals([breakfast, lunch], 15)).toEqual({ kind: 'done', mealCount: 2 });
  });
});

describe('done and empty', () => {
  it('is done when only an earlier meal is planned', () => {
    expect(todayMeals([breakfast], 11)).toEqual({ kind: 'done', mealCount: 1 });
  });

  it('is empty when nothing is planned at any hour', () => {
    for (const hour of [0, 9, 10, 14, 15, 23]) expect(todayMeals([], hour)).toEqual({ kind: 'empty' });
  });

  it('starts the new day from the morning list again at midnight', () => {
    expect(plannedSlots(fullDay, 23)).toEqual(['dinner']);
    expect(plannedSlots(fullDay, 0)).toEqual(['breakfast', 'lunch', 'dinner']);
  });
});

describe('millisUntilNextMealWindow', () => {
  const at = (hour: number, minute: number, second = 0) => new Date(2026, 9, 9, hour, minute, second);
  const minutes = (ms: number) => ms / 60_000;

  it('counts down to 10:00 in the morning', () => {
    expect(minutes(millisUntilNextMealWindow(at(9, 59)))).toBe(1);
    expect(minutes(millisUntilNextMealWindow(at(0, 0)))).toBe(600);
  });

  it('waits a full window when the clock sits exactly on a boundary', () => {
    expect(minutes(millisUntilNextMealWindow(at(10, 0)))).toBe(300);
    expect(minutes(millisUntilNextMealWindow(at(15, 0)))).toBe(540);
  });

  it('counts down to 15:00 and then to midnight', () => {
    expect(minutes(millisUntilNextMealWindow(at(14, 59)))).toBe(1);
    expect(minutes(millisUntilNextMealWindow(at(23, 59)))).toBe(1);
  });
});
