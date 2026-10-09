import type { PlanEntry, RecipeSummary } from '@alavo-daily/common/engine';
import { describe, expect, it } from 'vitest';

import { plainTranslate } from '../../testing/plainTranslate';
import { buildCookReminders, type CookReminderInput } from './cookReminders';
import { datesFrom } from './reminderTimes';

const NOW = new Date(2026, 9, 9, 12, 0).getTime();

function entry(overrides: Partial<PlanEntry> & Pick<PlanEntry, 'id' | 'date'>): PlanEntry {
  return {
    slot: 'dinner',
    recipeId: 'ga-kho',
    recipeName: 'Gà kho gừng',
    recipeIcon: 'cooking-pot',
    servings: 2,
    ...overrides,
  };
}

function summary(id: string, prepMin: number, cookMin: number): RecipeSummary {
  return {
    id,
    name: id,
    tags: [],
    prepMin,
    cookMin,
    servings: 4,
    level: 'easy',
    favorite: false,
    icon: 'cooking-pot',
    costVnd: 0,
    ingredientCount: 1,
  };
}

function input(overrides: Partial<CookReminderInput> = {}): CookReminderInput {
  return {
    entries: [entry({ id: 'e1', date: '2026-10-10' })],
    recipes: [summary('ga-kho', 15, 40)],
    dinnerTime: '17:30',
    dates: datesFrom('2026-10-09'),
    now: NOW,
    t: plainTranslate,
    ...overrides,
  };
}

describe('buildCookReminders', () => {
  it('reminds at dinner time minus the preparing and cooking minutes of the dish', () => {
    const [reminder] = buildCookReminders(input());
    expect(reminder?.at).toBe(new Date(2026, 9, 10, 16, 35).getTime());
    expect(reminder?.body).toBe('Đến giờ nấu Gà kho gừng (55 phút)');
    expect(reminder?.title).toBe('Đến giờ nấu bữa tối');
  });

  it('writes long cooking times in hours', () => {
    const slow = buildCookReminders(input({ recipes: [summary('ga-kho', 30, 60)] }));
    expect(slow[0]?.body).toBe('Đến giờ nấu Gà kho gừng (1 giờ 30 phút)');
    expect(slow[0]?.at).toBe(new Date(2026, 9, 10, 16, 0).getTime());
  });

  it('follows the dinner time of the rule', () => {
    const [reminder] = buildCookReminders(input({ dinnerTime: '19:00' }));
    expect(reminder?.at).toBe(new Date(2026, 9, 10, 18, 5).getTime());
  });

  it('reminds at dinner time itself when the dish has no times', () => {
    const quick = buildCookReminders(input({ recipes: [summary('ga-kho', 0, 0)] }));
    expect(quick[0]?.at).toBe(new Date(2026, 9, 10, 17, 30).getTime());
    expect(quick[0]?.body).toBe('Đến giờ nấu Gà kho gừng');
  });

  it('still reminds when the recipe is not in the list, without a duration', () => {
    const unknown = buildCookReminders(input({ recipes: [] }));
    expect(unknown[0]?.body).toBe('Đến giờ nấu Gà kho gừng');
  });

  it('only counts dinners', () => {
    const lunch = entry({ id: 'e2', date: '2026-10-10', slot: 'lunch' });
    const breakfast = entry({ id: 'e3', date: '2026-10-10', slot: 'breakfast' });
    expect(buildCookReminders(input({ entries: [lunch, breakfast] }))).toEqual([]);
  });

  it('leaves out dinners outside the seven days', () => {
    const later = entry({ id: 'e2', date: '2026-10-16' });
    const earlier = entry({ id: 'e3', date: '2026-10-08' });
    expect(buildCookReminders(input({ entries: [later, earlier] }))).toEqual([]);
    const lastDay = entry({ id: 'e4', date: '2026-10-15' });
    expect(buildCookReminders(input({ entries: [lastDay] }))).toHaveLength(1);
  });

  it('leaves out a reminder whose time has already passed', () => {
    const tonight = entry({ id: 'e2', date: '2026-10-09' });
    const late = buildCookReminders(input({ entries: [tonight], now: new Date(2026, 9, 9, 16, 40).getTime() }));
    expect(late).toEqual([]);
    const early = buildCookReminders(input({ entries: [tonight], now: new Date(2026, 9, 9, 16, 30).getTime() }));
    expect(early).toHaveLength(1);
  });

  it('gives each dinner dish its own reminder at its own start time, earliest first', () => {
    const entries = [
      entry({ id: 'e1', date: '2026-10-10', recipeId: 'rau', recipeName: 'Rau xào' }),
      entry({ id: 'e2', date: '2026-10-10', recipeId: 'ga-kho' }),
    ];
    const recipes = [summary('rau', 5, 5), summary('ga-kho', 15, 40)];
    const reminders = buildCookReminders(input({ entries, recipes }));
    expect(reminders.map((own) => own.body)).toEqual([
      'Đến giờ nấu Gà kho gừng (55 phút)',
      'Đến giờ nấu Rau xào (10 phút)',
    ]);
    expect(new Set(reminders.map((own) => own.id)).size).toBe(2);
  });

  it('uses the same id for the same dinner every time so a later schedule replaces it', () => {
    expect(buildCookReminders(input())[0]?.id).toBe(buildCookReminders(input())[0]?.id);
  });

  it('gives nothing for an invalid time', () => {
    expect(buildCookReminders(input({ dinnerTime: 'soon' }))).toEqual([]);
  });

  it('gives nothing without dinners', () => {
    expect(buildCookReminders(input({ entries: [] }))).toEqual([]);
  });
});
