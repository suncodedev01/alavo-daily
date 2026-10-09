import { monthOf, useEngineQuery } from '@alavo-daily/common';

import { todayText } from '../../../clock';
import { shoppingRangeEnd } from '../logic/today';

/** Everything the Today screen reads. Each query fails on its own when its module is missing. */
export function useTodayData() {
  const today = todayText();
  const month = monthOf(today);
  return {
    today,
    plan: useEngineQuery('recipes.get_plan', { from: today, days: 1 }),
    shopping: useEngineQuery('recipes.get_shopping_list', { from: today, to: shoppingRangeEnd(today) }),
    summary: useEngineQuery('spending.month_summary', { month, today }),
    budget: useEngineQuery('spending.budget_status', { month, today }),
    bills: useEngineQuery('spending.list_bills'),
    notifications: useEngineQuery('hub.list_notifications'),
    transactions: useEngineQuery('spending.list_transactions', { limit: 1 }),
    recipes: useEngineQuery('recipes.list'),
  };
}

export type TodayData = ReturnType<typeof useTodayData>;
