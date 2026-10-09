import { useEngineQuery, type BudgetLine } from '@alavo-daily/common/engine';
import { monthOf } from '@alavo-daily/common/format';

import { FOOD_CATEGORY_NAME } from '../../vocabulary';

export function useFoodBudgetLine(today: string): BudgetLine | null {
  const status = useEngineQuery('spending.budget_status', { month: monthOf(today), today });
  return status.data?.lines.find((line) => line.name === FOOD_CATEGORY_NAME) ?? null;
}
