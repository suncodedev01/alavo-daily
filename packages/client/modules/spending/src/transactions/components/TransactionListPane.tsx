import { useEngineQuery } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Pill, SearchField } from '@alavo-daily/design-system';

import { useLookups } from '../../lookups';
import { useToday } from '../../today';
import { Loadable, SkeletonRows } from '../../query-state';
import { filterTransactions } from '../logic/transactionList';
import type { ListCriteria, ListFilter } from '../types';
import { TransactionGroups } from './TransactionGroups';

export interface TransactionListPaneProps {
  month: string;
  selectedId: string | null;
  criteria: ListCriteria;
  onCriteriaChange: (criteria: ListCriteria) => void;
}

const FILTERS: { value: ListFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'expense', label: 'Chi' },
  { value: 'income', label: 'Thu' },
  { value: 'recurring', label: 'Định kỳ' },
];

export function TransactionListPane({ month, selectedId, criteria, onCriteriaChange }: TransactionListPaneProps) {
  const t = useT();
  const today = useToday();
  const lookups = useLookups();
  const query = useEngineQuery('spending.list_transactions', { month });
  const all = query.data ?? [];
  const visible = filterTransactions(all, criteria, lookups.categoryName);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3 max-lg:overflow-visible max-lg:p-0">
      <header className="flex shrink-0 items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold">{t('Tất cả giao dịch')}</h2>
        {query.data ? <span className="text-xs text-text-muted">{`${visible.length}/${all.length}`}</span> : null}
      </header>
      <SearchField
        label={t('Tìm giao dịch')}
        placeholder={t('Tìm theo tên hoặc danh mục')}
        clearLabel={t('Xoá tìm kiếm')}
        value={criteria.query}
        onValueChange={(value) => onCriteriaChange({ ...criteria, query: value })}
      />
      <div role="group" aria-label={t('Lọc giao dịch')} className="scrollbar-none flex shrink-0 gap-1 overflow-x-auto">
        {FILTERS.map((option) => (
          <Pill
            key={option.value}
            selected={criteria.filter === option.value}
            onClick={() => onCriteriaChange({ ...criteria, filter: option.value })}
          >
            {t(option.label)}
          </Pill>
        ))}
      </div>
      <Loadable query={query} skeleton={<SkeletonRows count={6} className="h-14 w-full" />}>
        {() =>
          lookups.isPending ? (
            <SkeletonRows count={6} className="h-14 w-full" />
          ) : (
            <TransactionGroups all={all} visible={visible} lookups={lookups} today={today} month={month} selectedId={selectedId} />
          )
        }
      </Loadable>
    </div>
  );
}
