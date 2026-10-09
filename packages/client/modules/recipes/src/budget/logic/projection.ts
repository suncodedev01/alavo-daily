import type { BudgetLine } from '@alavo-daily/common/engine';
import type { FoodProjection } from '../types';

export const RAISE_STEP_VND = 50_000;

export function projectFoodBudget(line: BudgetLine, extraVnd: number): FoodProjection {
  const projectedVnd = line.spentVnd + extraVnd;
  return {
    extraVnd,
    projectedVnd,
    remainingVnd: line.budgetVnd - line.spentVnd,
    overVnd: Math.max(0, projectedVnd - line.budgetVnd),
    ratio: line.budgetVnd > 0 ? projectedVnd / line.budgetVnd : 0,
  };
}

export function raiseAmountFor(overVnd: number): number {
  return Math.ceil(overVnd / RAISE_STEP_VND) * RAISE_STEP_VND;
}
