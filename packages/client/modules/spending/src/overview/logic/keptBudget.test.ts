import { beforeEach, describe, expect, it } from 'vitest';

import { dismissalKey } from './decision';
import { rememberKeptBudget } from './keptBudget';

const FOOD = { categoryId: 'category-food', budgetVnd: 2_600_000 };

beforeEach(() => window.localStorage.clear());

describe('rememberKeptBudget', () => {
  it('sets the flag the decision card reads for the month of today', () => {
    rememberKeptBudget(FOOD, '2026-10-09');
    expect(window.localStorage.getItem(dismissalKey(FOOD, '2026-10'))).toBe('1');
  });

  it('leaves another month and another budget amount undecided', () => {
    rememberKeptBudget(FOOD, '2026-10-09');
    expect(window.localStorage.getItem(dismissalKey(FOOD, '2026-11'))).toBeNull();
    expect(window.localStorage.getItem(dismissalKey({ ...FOOD, budgetVnd: 2_900_000 }, '2026-10'))).toBeNull();
  });
});
