import type { Transaction } from '@alavo-daily/common/engine';
import { foldText } from '@alavo-daily/common/format';

import type { ListFilter, DayGroup, ListCriteria } from '../types';

export function groupByDay(items: readonly Transaction[]): DayGroup[] {
  const groups = new Map<string, Transaction[]>();
  for (const item of items) {
    const bucket = groups.get(item.occurredOn) ?? [];
    bucket.push(item);
    groups.set(item.occurredOn, bucket);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, bucket]) => ({ date, items: bucket }));
}

export { foldText };

function matchesFilter(item: Transaction, filter: ListFilter): boolean {
  if (filter === 'expense') return item.amountVnd < 0;
  if (filter === 'income') return item.amountVnd > 0;
  if (filter === 'recurring') return item.recurringRule !== null || Boolean(item.recurringSourceId);
  return true;
}

export function filterTransactions(
  items: readonly Transaction[],
  criteria: ListCriteria,
  categoryNameOf: (categoryId: string) => string,
): Transaction[] {
  const needle = foldText(criteria.query);
  return items.filter((item) => {
    if (!matchesFilter(item, criteria.filter)) return false;
    if (needle === '') return true;
    const haystack = foldText(`${item.title} ${item.note} ${categoryNameOf(item.categoryId)}`);
    return haystack.includes(needle);
  });
}
