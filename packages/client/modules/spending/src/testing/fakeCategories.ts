import type { Category, Transaction } from '@alavo-daily/common/engine';
import { EngineCallError } from '@alavo-daily/common/engine';

import type { FakeData } from './fixtures';

function invalid(message: string): EngineCallError {
  return new EngineCallError('validation', message);
}

function findCategory(data: FakeData, id: string): Category {
  const found = data.categories.find((item) => item.id === id);
  if (!found) throw new EngineCallError('not_found', `category ${id} was not found`);
  return found;
}

function moved(items: Transaction[], from: string, to: string): Transaction[] {
  return items.map((item) => (item.categoryId === from ? { ...item, categoryId: to } : item));
}

export function settleCategoryTransactions(
  data: FakeData,
  id: string,
  moveTransactionsTo: string | undefined,
  deleteTransactions: boolean | undefined,
): void {
  if (moveTransactionsTo && deleteTransactions) throw invalid('move the transactions or delete them, not both');
  if (moveTransactionsTo) {
    if (moveTransactionsTo === id) throw invalid('choose a different category');
    if (findCategory(data, id).kind !== findCategory(data, moveTransactionsTo).kind) {
      throw invalid('move the transactions to a category of the same kind');
    }
    data.transactions = moved(data.transactions, id, moveTransactionsTo);
  } else if (deleteTransactions) {
    data.transactions = data.transactions.filter((item) => item.categoryId !== id);
  } else {
    throw invalid('category still has transactions');
  }
}

export function reorderCategories(data: FakeData, ids: string[]): Category[] {
  const chosen = ids.map((id) => findCategory(data, id));
  const slots = chosen.map((item) => item.position).sort((a, b) => a - b);
  chosen.forEach((item, index) => {
    const next = { ...item, position: slots[index] ?? item.position };
    data.categories = data.categories.map((entry) => (entry.id === item.id ? next : entry));
  });
  const kind = chosen[0]?.kind;
  return data.categories.filter((item) => item.kind === kind).sort((a, b) => a.position - b.position);
}
