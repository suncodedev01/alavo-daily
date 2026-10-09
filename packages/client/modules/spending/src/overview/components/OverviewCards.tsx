import { useEngineQuery, type BudgetStatus, type Goal } from '@alavo-daily/common/engine';
import { formatPercent, formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Button, EmptyState, Meter } from '@alavo-daily/design-system';

import { useLookups } from '../../lookups';
import { Loadable, SkeletonRows } from '../../query-state';
import { LinkButton } from '../../navigation';
import { SectionCard } from './SectionCard';
import { useOpenAddTransaction } from '../../transaction-form';
import { transactionListPath, transactionPath } from '../../transaction-model';
import { TransactionRow } from '../../transactions';
import { DailyChart } from './DailyChart';
import type { MonthScope } from '../types';

const TOP_BUDGET_COUNT = 4;
const RECENT_COUNT = 5;
const GOAL_COUNT = 3;

export function DailySpendingCard({ month, today, isCurrentMonth }: MonthScope) {
  const t = useT();
  const summary = useEngineQuery('spending.month_summary', { month, today });
  return (
    <SectionCard title={t('Chi tiêu theo ngày')} hint={t('Không gồm chi phí cố định')} className="lg:col-span-2">
      <Loadable query={summary} skeleton={<SkeletonRows count={1} className="h-64 w-full" />}>
        {(data) =>
          data.dailyExpenseVnd.every((value) => value === 0) ? (
            <p className="py-8 text-center text-sm text-text-muted">{t('Chưa có khoản chi nào trong tháng này.')}</p>
          ) : (
            <DailyChart dailyVnd={data.dailyExpenseVnd} highlightToday={isCurrentMonth} month={month} />
          )
        }
      </Loadable>
    </SectionCard>
  );
}

export function BudgetsSummaryCard({ month, today }: Omit<MonthScope, 'isCurrentMonth'>) {
  const t = useT();
  const status = useEngineQuery('spending.budget_status', { month, today });
  return (
    <SectionCard
      title={t('Ngân sách')}
      action={
        <LinkButton to="/spending/budgets" variant="ghost" size="sm">
          {t('Chi tiết')}
        </LinkButton>
      }
    >
      <Loadable query={status} skeleton={<SkeletonRows count={3} className="h-10 w-full" />}>
        {(data) => <BudgetLines status={data} />}
      </Loadable>
    </SectionCard>
  );
}

function BudgetLines({ status }: { status: BudgetStatus }) {
  const t = useT();
  if (status.lines.length === 0) {
    return <p className="text-sm text-text-muted">{t('Chưa đặt ngân sách cho hạng mục nào.')}</p>;
  }
  const top = [...status.lines].sort((a, b) => b.pct - a.pct).slice(0, TOP_BUDGET_COUNT);
  return (
    <div className="grid gap-3">
      <p className="text-sm text-text-secondary">{`${formatVnd(status.totalSpentVnd)} / ${formatVnd(status.totalBudgetVnd)}`}</p>
      <Meter value={status.totalSpentVnd / status.totalBudgetVnd} label={t('Tổng ngân sách đã dùng')} />
      <ul className="grid divide-y divide-line-hairline">
        {top.map((line) => (
          <li key={line.categoryId} className="grid gap-2 py-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="flex-1 font-medium">{t(line.name)}</span>
              <span className={line.tone === 'normal' ? 'text-text-muted' : 'font-semibold'}>{formatPercent(line.pct)}</span>
            </div>
            <Meter value={line.pct} tone={line.tone} label={t('Đã dùng ngân sách {{name}}', { name: t(line.name) })} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RecentTransactionsCard({ month }: { month: string }) {
  const t = useT();
  const lookups = useLookups();
  const openAdd = useOpenAddTransaction();
  const query = useEngineQuery('spending.list_transactions', { month, limit: RECENT_COUNT });
  return (
    <SectionCard
      title={t('Giao dịch gần đây')}
      action={
        <LinkButton to={transactionListPath(month)} variant="ghost" size="sm">
          {t('Xem tất cả')}
        </LinkButton>
      }
    >
      <Loadable query={query} skeleton={<SkeletonRows count={4} />}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState
              icon="receipt"
              title={t('Chưa có giao dịch nào')}
              description={t('Ghi khoản chi đầu tiên để biết tiền đang đi đâu.')}
              action={
                <Button leadingIcon="plus" onClick={openAdd}>
                  {t('Thêm giao dịch')}
                </Button>
              }
            />
          ) : (
            <div className="-mx-3 grid grid-cols-1 gap-1">
              {items.map((item) => (
                <TransactionRow key={item.id} transaction={item} lookups={lookups} to={transactionPath(item.id, month)} />
              ))}
            </div>
          )
        }
      </Loadable>
    </SectionCard>
  );
}

export function GoalsSummaryCard() {
  const t = useT();
  const goals = useEngineQuery('spending.list_goals');
  return (
    <SectionCard
      title={t('Mục tiêu tiết kiệm')}
      action={
        <LinkButton to="/spending/goals" variant="ghost" size="sm">
          {t('Xem tất cả')}
        </LinkButton>
      }
    >
      <Loadable query={goals} skeleton={<SkeletonRows count={3} className="h-12 w-full" />}>
        {(items) => (items.length === 0 ? <NoGoals /> : <GoalLines goals={items.slice(0, GOAL_COUNT)} />)}
      </Loadable>
    </SectionCard>
  );
}

function NoGoals() {
  const t = useT();
  return (
    <div className="grid justify-items-start gap-3">
      <p className="text-sm text-text-muted">{t('Bạn chưa có mục tiêu tiết kiệm nào.')}</p>
      <LinkButton to="/spending/goals" variant="outline" size="sm" leadingIcon="target">
        {t('Tạo mục tiêu')}
      </LinkButton>
    </div>
  );
}

function GoalLines({ goals }: { goals: Goal[] }) {
  const t = useT();
  return (
    <ul className="grid divide-y divide-line-hairline">
      {goals.map((goal) => {
        const ratio = goal.savedVnd / goal.targetVnd;
        return (
          <li key={goal.id} className="grid gap-2 py-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="flex-1 font-medium">{goal.name}</span>
              <span className="text-text-muted">{formatPercent(ratio)}</span>
            </div>
            <Meter value={ratio} tone="normal" label={t('Tiến độ {{name}}', { name: goal.name })} />
            <span className="text-xs text-text-muted">{`${formatVnd(goal.savedVnd)} / ${formatVnd(goal.targetVnd)}`}</span>
          </li>
        );
      })}
    </ul>
  );
}
