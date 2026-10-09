import type { PlanEntry, ShoppingItem, ShoppingList } from '@alavo-daily/common/engine';
import { describe, expect, it } from 'vitest';

import { plainTranslate } from '../../testing/plainTranslate';
import {
  buildDefrostReminders,
  meatAndFishDishes,
  type DefrostReminderInput,
} from './defrostReminders';
import { datesFrom } from './reminderTimes';

const NOW = new Date(2026, 9, 9, 12, 0).getTime();

function entry(id: string, date: string, recipeName: string, slot: PlanEntry['slot'] = 'dinner'): PlanEntry {
  return { id, date, slot, recipeId: recipeName, recipeName, recipeIcon: 'cooking-pot', servings: 2 };
}

function item(name: string, aisle: ShoppingItem['aisle'], from: string[]): ShoppingItem {
  return { key: `${name}|g`, name, unit: 'g', aisle, quantity: 1, costVnd: 0, from, have: false, custom: false };
}

function list(items: ShoppingItem[]): ShoppingList {
  return { from: '2026-10-10', to: '2026-10-16', items, neededCount: items.length, neededCostVnd: 0 };
}

function input(overrides: Partial<DefrostReminderInput> = {}): DefrostReminderInput {
  return {
    entries: [entry('e1', '2026-10-10', 'Gà kho gừng')],
    meatDishes: new Set(['Gà kho gừng']),
    cookDates: datesFrom('2026-10-10'),
    time: '21:00',
    now: NOW,
    t: plainTranslate,
    ...overrides,
  };
}

describe('meatAndFishDishes', () => {
  it('names the recipes that need something from the meat and fish aisle', () => {
    const dishes = meatAndFishDishes(
      list([
        item('Đùi gà', 'meat_fish', ['Gà kho gừng', 'Cơm gà']),
        item('Cá lóc', 'meat_fish', ['Canh chua']),
        item('Cà chua', 'vegetables', ['Canh chua', 'Rau xào']),
        item('Nước mắm', 'spices', ['Gà kho gừng']),
      ]),
    );
    expect([...dishes].sort()).toEqual(['Canh chua', 'Cơm gà', 'Gà kho gừng']);
  });

  it('is empty without meat or fish, and a hand-added item names no recipe', () => {
    expect(meatAndFishDishes(list([item('Rau', 'vegetables', ['Rau xào'])])).size).toBe(0);
    expect(meatAndFishDishes(list([item('Thịt', 'meat_fish', [])])).size).toBe(0);
  });
});

describe('buildDefrostReminders', () => {
  it('reminds the evening before a dish with meat or fish', () => {
    const [reminder] = buildDefrostReminders(input());
    expect(reminder?.at).toBe(new Date(2026, 9, 9, 21, 0).getTime());
    expect(reminder?.body).toBe('Mai nấu Gà kho gừng: nhớ lấy thịt ra rã đông');
    expect(reminder?.title).toBe('Rã đông cho ngày mai');
  });

  it('follows the time of the rule', () => {
    expect(buildDefrostReminders(input({ time: '20:30' }))[0]?.at).toBe(new Date(2026, 9, 9, 20, 30).getTime());
  });

  it('skips a dish without meat or fish', () => {
    const veggie = entry('e2', '2026-10-11', 'Rau xào');
    expect(buildDefrostReminders(input({ entries: [veggie] }))).toEqual([]);
  });

  it('counts a dish of any meal, not only dinner', () => {
    const breakfast = entry('e2', '2026-10-11', 'Gà kho gừng', 'breakfast');
    const lunch = entry('e3', '2026-10-12', 'Gà kho gừng', 'lunch');
    const reminders = buildDefrostReminders(input({ entries: [breakfast, lunch] }));
    expect(reminders.map((own) => own.at)).toEqual([
      new Date(2026, 9, 10, 21, 0).getTime(),
      new Date(2026, 9, 11, 21, 0).getTime(),
    ]);
  });

  it('names every meat dish of the day once in a single reminder', () => {
    const entries = [
      entry('e1', '2026-10-10', 'Gà kho gừng', 'lunch'),
      entry('e2', '2026-10-10', 'Gà kho gừng'),
      entry('e3', '2026-10-10', 'Canh chua'),
      entry('e4', '2026-10-10', 'Rau xào'),
    ];
    const reminders = buildDefrostReminders(input({ entries, meatDishes: new Set(['Gà kho gừng', 'Canh chua']) }));
    expect(reminders).toHaveLength(1);
    expect(reminders[0]?.body).toBe('Mai nấu Gà kho gừng, Canh chua: nhớ lấy thịt ra rã đông');
  });

  it('gives each day its own reminder with its own id', () => {
    const entries = [entry('e1', '2026-10-10', 'Gà kho gừng'), entry('e2', '2026-10-11', 'Gà kho gừng')];
    const reminders = buildDefrostReminders(input({ entries }));
    expect(new Set(reminders.map((own) => own.id)).size).toBe(2);
  });

  it('leaves out dishes on days that are not asked for', () => {
    const far = entry('e2', '2026-10-30', 'Gà kho gừng');
    expect(buildDefrostReminders(input({ entries: [far] }))).toEqual([]);
  });

  it('leaves out a reminder whose evening has already passed', () => {
    const tonight = new Date(2026, 9, 9, 22, 0).getTime();
    expect(buildDefrostReminders(input({ now: tonight }))).toEqual([]);
  });

  it('gives nothing for an invalid time or without dishes', () => {
    expect(buildDefrostReminders(input({ time: '99:99' }))).toEqual([]);
    expect(buildDefrostReminders(input({ entries: [] }))).toEqual([]);
  });
});
