import type { Transaction } from '@alavo-daily/common/engine';

export type ListFilter = 'all' | 'expense' | 'income' | 'recurring';

export interface DayGroup {
  date: string;
  items: Transaction[];
}

export interface ListCriteria {
  filter: ListFilter;
  query: string;
}
