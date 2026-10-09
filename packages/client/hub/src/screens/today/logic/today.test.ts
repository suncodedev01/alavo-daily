import { describe, expect, it } from 'vitest';

import { aFoodBudget, aShoppingList } from '../../../testing/hubEngine';
import {
  decideFoodBudget,
  dinnerEntries,
  foodBudgetLine,
  isFirstRun,
  longDateLabel,
  missingIngredientCount,
  nextDueDate,
  roundUpToStep,
  spentToday,
  upcomingBills,
} from './today';

const line = (spentVnd: number, budgetVnd = 1_000_000) => foodBudgetLine(aFoodBudget(spentVnd, budgetVnd).lines);

describe('decideFoodBudget', () => {
  it('has nothing to decide without a shopping cost', () => {
    expect(decideFoodBudget(aShoppingList(0), line(500_000))).toEqual({ kind: 'none' });
  });

  it('has nothing to decide without a food budget line', () => {
    expect(decideFoodBudget(aShoppingList(100_000), undefined)).toEqual({ kind: 'none' });
    expect(decideFoodBudget(undefined, line(0))).toEqual({ kind: 'none' });
  });

  it('fits when the cost is below what is left', () => {
    const decision = decideFoodBudget(aShoppingList(200_000), line(500_000));
    expect(decision).toEqual({ kind: 'fits', projectedRatio: 0.7 });
  });

  it('fits when the cost equals exactly what is left', () => {
    expect(decideFoodBudget(aShoppingList(500_000), line(500_000)).kind).toBe('fits');
  });

  it('asks for a decision one đồng over, rounding the raise up to 100.000', () => {
    const decision = decideFoodBudget(aShoppingList(500_001), line(500_000));
    expect(decision).toMatchObject({ kind: 'over', overByVnd: 1, raiseByVnd: 100_000 });
  });

  it('describes the overrun like the mockup: 436.000 against 203.000 left', () => {
    const decision = decideFoodBudget(aShoppingList(436_000), line(2_397_000, 2_600_000));
    expect(decision).toMatchObject({
      kind: 'over',
      costVnd: 436_000,
      remainingVnd: 203_000,
      overByVnd: 233_000,
      raiseByVnd: 300_000,
    });
  });

  it('reports no remaining budget when it is already overspent', () => {
    const decision = decideFoodBudget(aShoppingList(50_000), line(1_200_000));
    expect(decision).toMatchObject({ kind: 'over', remainingVnd: 0, overByVnd: 250_000 });
  });
});

describe('roundUpToStep', () => {
  it('keeps exact multiples and rounds the rest up', () => {
    expect(roundUpToStep(200_000)).toBe(200_000);
    expect(roundUpToStep(233_000)).toBe(300_000);
  });
});

describe('Today helpers', () => {
  it('keeps dinner entries only', () => {
    const entries = [
      { id: '1', slot: 'lunch' },
      { id: '2', slot: 'dinner' },
    ] as never;
    expect(dinnerEntries(entries).map((entry) => entry.id)).toEqual(['2']);
  });

  it('counts needed ingredients that belong to tonight dinner', () => {
    const shopping = aShoppingList(0, ['Gà', 'Gừng']);
    const first = shopping.items[0];
    if (first) first.have = true;
    expect(missingIngredientCount(shopping, ['Gà kho gừng'])).toBe(1);
    expect(missingIngredientCount(shopping, ['Món khác'])).toBe(0);
  });

  it('takes today spending from the last daily value', () => {
    expect(spentToday([0, 20_000, 113_000])).toBe(113_000);
    expect(spentToday([])).toBe(0);
  });

  it('is a first run only when there are no transactions and no recipes', () => {
    expect(isFirstRun(0, 0)).toBe(true);
    expect(isFirstRun(1, 0)).toBe(false);
    expect(isFirstRun(0, 3)).toBe(false);
  });

  it('writes the long date in Vietnamese', () => {
    expect(longDateLabel('2026-10-09')).toBe('Thứ Sáu, 9 tháng 10');
  });
});

describe('upcoming bills', () => {
  it('uses this month when the day has not passed and next month otherwise', () => {
    expect(nextDueDate(12, '2026-10-09')).toBe('2026-10-12');
    expect(nextDueDate(9, '2026-10-09')).toBe('2026-10-09');
    expect(nextDueDate(5, '2026-10-09')).toBe('2026-11-05');
  });

  it('clamps day 31 to the end of a short month and wraps the year', () => {
    expect(nextDueDate(31, '2026-02-10')).toBe('2026-02-28');
    expect(nextDueDate(3, '2026-12-20')).toBe('2027-01-03');
  });

  it('sorts active bills by due date and drops inactive ones', () => {
    const bill = (id: string, dayOfMonth: number, active = true) =>
      ({ id, title: id, icon: 'receipt', amountVnd: 1000, dayOfMonth, active }) as never;
    const result = upcomingBills([bill('c', 3), bill('a', 12), bill('off', 10, false), bill('b', 15)], '2026-10-09');
    expect(result.map((item) => item.dueOn)).toEqual(['2026-10-12', '2026-10-15', '2026-11-03']);
  });

  it('shows at most four bills', () => {
    const bills = Array.from({ length: 6 }, (_, index) => ({
      id: `b${index}`,
      title: 'x',
      icon: 'receipt',
      amountVnd: 1,
      dayOfMonth: 10 + index,
      active: true,
    }));
    expect(upcomingBills(bills, '2026-10-09')).toHaveLength(4);
  });
});
