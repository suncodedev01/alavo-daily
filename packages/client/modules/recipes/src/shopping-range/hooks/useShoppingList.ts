import { useEngineQuery } from '@alavo-daily/common/engine';

import type { DateRange } from '../types';

export function useShoppingList(range: DateRange) {
  return useEngineQuery('recipes.get_shopping_list', range);
}
