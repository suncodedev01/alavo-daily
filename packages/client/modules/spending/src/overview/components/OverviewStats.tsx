import { useEngineQuery, type MonthSummary } from '@alavo-daily/common/engine';
import { addMonths, formatPercent, formatSignedVnd, formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Button, Card, Eyebrow, Icon, Skeleton } from '@alavo-daily/design-system';
import { useState } from 'react';

import { formatBalance, MoneyAmount } from '../../money';
import { useLookups } from '../../lookups';
import { WalletsDialog } from '../../wallets';
import { Loadable } from '../../query-state';
import { deltaRatio } from '../logic/delta';

export interface OverviewStatsProps {
  month: string;
  today: string;
}

function monthNumber(month: string): number {
  return Number(month.slice(5));
}

export function OverviewStats({ month, today }: OverviewStatsProps) {
  const summary = useEngineQuery('spending.month_summary', { month, today });
  const previous = useEngineQuery('spending.month_summary', { month: addMonths(month, -1), today });
  return (
    <Loadable query={summary} skeleton={<StatsSkeleton />} skeletonClassName="col-span-2 lg:col-span-9">
      {(current) => (
        <>
          <BalanceCard summary={current} />
          <IncomeCard summary={current} previousIncomeVnd={previous.data?.incomeVnd ?? null} />
          <ExpenseCard summary={current} />
        </>
      )}
    </Loadable>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-9">
      <Skeleton className="col-span-2 h-40 w-full lg:col-span-5 lg:row-span-2" />
      <Skeleton className="h-18 w-full lg:col-span-4" />
      <Skeleton className="h-18 w-full lg:col-span-4" />
    </div>
  );
}

function BalanceCard({ summary }: { summary: MonthSummary }) {
  const t = useT();
  const lookups = useLookups();
  const [managing, setManaging] = useState(false);
  return (
    <Card className="col-span-2 grid content-between gap-4 lg:col-span-5 lg:row-span-2" aria-label={t('Tổng số dư')}>
      <div>
        <Eyebrow>{t('Tổng số dư')}</Eyebrow>
        <p className="mt-2 text-display font-semibold whitespace-nowrap max-lg:text-2xl">{formatBalance(summary.totalBalanceVnd)}</p>
      </div>
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-4 border-t border-line-hairline pt-4 text-sm">
        <div className="grid gap-1">
          <dt className="text-text-muted">{t('Dòng tiền ròng tháng {{month}}', { month: monthNumber(summary.month) })}</dt>
          <dd className="font-semibold">
            <MoneyAmount amountVnd={summary.netVnd} />
          </dd>
        </div>
        <div className="grid justify-items-start gap-1">
          <dt className="text-text-muted">{t('Trên {{wallets}} ví và tài khoản', { wallets: lookups.wallets.length })}</dt>
          <dd className="flex flex-wrap items-center gap-x-2 text-text-muted">
            <span>{t('{{total}} giao dịch', { total: summary.transactionCount })}</span>
            <Button variant="ghost" size="sm" leadingIcon="wallet" onClick={() => setManaging(true)}>
              {t('Quản lý ví')}
            </Button>
          </dd>
        </div>
      </dl>
      <WalletsDialog open={managing} onOpenChange={setManaging} />
    </Card>
  );
}

function IncomeCard({ summary, previousIncomeVnd }: { summary: MonthSummary; previousIncomeVnd: number | null }) {
  const t = useT();
  const delta = previousIncomeVnd === null ? null : deltaRatio(summary.incomeVnd, previousIncomeVnd);
  return (
    <Card aria-label={t('Thu nhập')} className="lg:col-span-4">
      <Eyebrow>{t('Thu nhập tháng {{month}}', { month: monthNumber(summary.month) })}</Eyebrow>
      <p className="mt-2 text-2xl font-semibold text-income-fg max-lg:text-title">{formatSignedVnd(summary.incomeVnd)}</p>
      <DeltaLine delta={delta} month={summary.month} />
    </Card>
  );
}

function ExpenseCard({ summary }: { summary: MonthSummary }) {
  const t = useT();
  return (
    <Card aria-label={t('Chi tiêu')} className="lg:col-span-4">
      <Eyebrow>{t('Chi tiêu tháng {{month}}', { month: monthNumber(summary.month) })}</Eyebrow>
      <p className="mt-2 text-2xl font-semibold text-expense-fg max-lg:text-title">{formatVnd(summary.expenseVnd)}</p>
      <DeltaLine delta={summary.expenseDeltaPct} month={summary.month} />
    </Card>
  );
}

function DeltaLine({ delta, month }: { delta: number | null; month: string }) {
  const t = useT();
  const previous = monthNumber(addMonths(month, -1));
  if (delta === null) {
    return <p className="mt-2 text-xs text-text-muted">{t('Chưa có số liệu tháng {{month}} để so sánh', { month: previous })}</p>;
  }
  const higher = delta >= 0;
  const text = higher
    ? t('Cao hơn tháng {{month}} {{pct}}', { month: previous, pct: formatPercent(Math.abs(delta)) })
    : t('Thấp hơn tháng {{month}} {{pct}}', { month: previous, pct: formatPercent(Math.abs(delta)) });
  return (
    <p className="mt-2 flex items-center gap-1 text-xs text-text-muted">
      <Icon name={higher ? 'arrow-up-right' : 'arrow-down-left'} />
      {text}
    </p>
  );
}
