import { describe, expect, it } from 'vitest';

import { foodLine } from '../../testing/fakeSpending';
import { projectFoodBudget, raiseAmountFor } from './projection';

describe('projectFoodBudget', () => {
  const line = foodLine({ budgetVnd: 1_000_000, spentVnd: 797_000 });

  it('adds the shopping cost to what is already spent', () => {
    const projection = projectFoodBudget(line, 100_000);
    expect(projection.projectedVnd).toBe(897_000);
    expect(projection.remainingVnd).toBe(203_000);
    expect(projection.overVnd).toBe(0);
  });

  it('is not over at exactly the budget', () => {
    expect(projectFoodBudget(line, 203_000).overVnd).toBe(0);
  });

  it('reports the excess and a ratio above one', () => {
    const projection = projectFoodBudget(line, 436_000);
    expect(projection.overVnd).toBe(233_000);
    expect(projection.ratio).toBeCloseTo(1.233);
  });
});

describe('raiseAmountFor', () => {
  it('rounds the excess up to a step of 50.000', () => {
    expect(raiseAmountFor(233_000)).toBe(250_000);
    expect(raiseAmountFor(50_000)).toBe(50_000);
    expect(raiseAmountFor(1)).toBe(50_000);
  });
});
