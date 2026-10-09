const TRANSACTIONS_PATH = '/spending/transactions';

function monthSearch(month: string | null): string {
  return month ? `?month=${month}` : '';
}

export function transactionListPath(month: string | null): string {
  return `${TRANSACTIONS_PATH}${monthSearch(month)}`;
}

export function transactionPath(id: string, month: string | null): string {
  return `${TRANSACTIONS_PATH}/${id}${monthSearch(month)}`;
}
