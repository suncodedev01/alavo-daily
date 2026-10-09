import { useSyncExternalStore } from 'react';

import type { DateRange } from '../../shopping-range';
import { isExpenseLogged, subscribeToLoggedExpenses } from '../logic/loggedExpenses';

export function useExpenseLogged(range: DateRange): boolean {
  return useSyncExternalStore(subscribeToLoggedExpenses, () => isExpenseLogged(range));
}
