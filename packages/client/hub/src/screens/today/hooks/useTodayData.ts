import { monthOf, toDateText, useEngineQuery } from '@alavo-daily/common';

import { useNow } from '../../../clock';
import { shoppingRangeEnd } from '../logic/today';
import { millisUntilNextMealWindow } from '../logic/todayMeals';

/** Everything the Today screen reads. Each query fails on its own when its module is missing. */
export function useTodayData() {
  const now = useNow(millisUntilNextMealWindow);
  const today = toDateText(now);
  const month = monthOf(today);
  return {
    today,
    hour: now.getHours(),
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
