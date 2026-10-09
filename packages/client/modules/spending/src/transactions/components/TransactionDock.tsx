import { useEngineQuery, type BudgetLine, type Transaction } from '@alavo-daily/common/engine';
import { formatPercent, formatVnd, monthOf } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { ContextSection, Meter } from '@alavo-daily/design-system';
import { useSearchParams } from 'react-router';

import { useLookups, type Lookups } from '../../lookups';
import { useToday } from '../../today';
import { Loadable, SkeletonRows } from '../../query-state';
import { transactionPath } from '../../transaction-model';
import { TransactionRow } from './TransactionRow';

const SAME_CATEGORY_LIMIT = 4;

export function TransactionDock({ id }: { id: string }) {
  const query = useEngineQuery('spending.get_transaction', { id });
  const lookups = useLookups();
  if (query.isError) return null;
  return (
    <Loadable query={query} skeleton={<SkeletonRows count={3} />}>
      {(transaction) => (
        <div>
          <CategoryBudget transaction={transaction} lookups={lookups} />
          <SameCategory transaction={transaction} lookups={lookups} />
        </div>
      )}
    </Loadable>
  );
}

function CategoryBudget({ transaction, lookups }: { transaction: Transaction; lookups: Lookups }) {
  const t = useT();
  const today = useToday();
  const month = monthOf(transaction.occurredOn);
  const status = useEngineQuery('spending.budget_status', { month, today });
  const categoryName = lookups.categoryName(transaction.categoryId);
  return (
    <ContextSection title={t('Ngân sách danh mục')} defaultOpen>
      <Loadable query={status} skeleton={<SkeletonRows count={1} className="h-10 w-full" />}>
        {(data) => {
          const line = data.lines.find((entry) => entry.categoryId === transaction.categoryId);
          return line ? (
            <BudgetMeter line={line} name={categoryName} />
          ) : (
            <p className="text-sm text-text-secondary">{t('{{name}} không có ngân sách riêng.', { name: categoryName })}</p>
          );
        }}
      </Loadable>
    </ContextSection>
  );
}

function BudgetMeter({ line, name }: { line: BudgetLine; name: string }) {
  const t = useT();
  const remaining =
    line.remainingVnd >= 0
      ? t('còn {{amount}}', { amount: formatVnd(line.remainingVnd) })
      : t('vượt {{amount}}', { amount: formatVnd(line.remainingVnd) });
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="flex-1 font-medium">{name}</span>
        <span className="text-text-muted">{formatPercent(line.pct)}</span>
      </div>
      <Meter value={line.pct} tone={line.tone} label={t('Đã dùng ngân sách {{name}}', { name })} />
      <p className="text-xs text-text-muted">{`${formatVnd(line.spentVnd)} / ${formatVnd(line.budgetVnd)} · ${remaining}`}</p>
    </div>
  );
}

function SameCategory({ transaction, lookups }: { transaction: Transaction; lookups: Lookups }) {
  const t = useT();
  const [params] = useSearchParams();
  const query = useEngineQuery('spending.list_transactions', { categoryId: transaction.categoryId, limit: SAME_CATEGORY_LIMIT + 2 });
  const others = (query.data ?? []).filter((item) => item.id !== transaction.id).slice(0, SAME_CATEGORY_LIMIT);
  return (
    <ContextSection title={t('Cùng danh mục ({{total}})', { total: others.length })} defaultOpen>
      <Loadable query={query} skeleton={<SkeletonRows count={2} />}>
        {() =>
          others.length === 0 ? (
            <p className="text-sm text-text-muted">{t('Chưa có giao dịch khác.')}</p>
          ) : (
            <div className="-mx-3 grid gap-1">
              {others.map((item) => (
                <TransactionRow key={item.id} transaction={item} lookups={lookups} to={transactionPath(item.id, params.get('month'))} />
              ))}
            </div>
          )
        }
      </Loadable>
    </ContextSection>
  );
}
