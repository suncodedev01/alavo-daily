import type { BudgetLine } from '@alavo-daily/common/engine';
import { monthOf } from '@alavo-daily/common/format';

import { dismissalKey } from './decision';
import { writeFlag } from './dismissalFlag';

export type KeptBudget = Pick<BudgetLine, 'categoryId' | 'budgetVnd'>;

export function rememberKeptBudget(budget: KeptBudget, today: string): void {
  writeFlag(dismissalKey(budget, monthOf(today)));
}
