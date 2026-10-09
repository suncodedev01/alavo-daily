import type { ReactNode } from 'react';

import { Screen, useLanguage, useT } from '@alavo-daily/common';
import { PageColumn, Skeleton, useLayout } from '@alavo-daily/design-system';

import { useModules } from '../../../module-registry';
import { SyncNowButton } from '../../../sync-status';
import { FirstRunState } from './FirstRunState';
import { DinnerCard, MealsCard, ShoppingCard, SpendingCard } from './TodayCards';
import {
  DecisionSection,
  RecentNotificationsSection,
  UpcomingBillsSection,
  useKeptDecision,
} from './TodaySideSections';
import { QuickAddMenu } from './QuickAddMenu';
import { decideFoodBudget, foodBudgetLine, isFirstRun, longDateLabel, spentToday, upcomingBills } from '../logic/today';
import { useTodayData, type TodayData } from '../hooks/useTodayData';

export function TodayScreen() {
  const t = useT();
  const wide = useLayout() === 'wide';
  const data = useTodayData();
  const loading = data.transactions.isPending || data.recipes.isPending;
  const firstRun = isFirstRun(data.transactions.data?.length ?? 0, data.recipes.data?.length ?? 0);
  const { decision, rest } = useSideSections(data);
  const showSide = !loading && !firstRun;
  return (
    <Screen
      title={t('Hôm nay')}
      actions={
        <div className="flex items-center gap-2">
          <SyncNowButton />
          <QuickAddMenu />
        </div>
      }
      dock={wide && showSide ? <>{decision}{rest}</> : undefined}
    >
      <PageColumn>
        <Greeting today={data.today} />
        {loading ? <TodaySkeleton /> : null}
        {!loading && firstRun ? <FirstRunState /> : null}
        {showSide ? <TodayCards data={data} narrowDecision={wide ? null : decision} /> : null}
        {showSide && !wide ? rest : null}
      </PageColumn>
    </Screen>
  );
}

function Greeting({ today }: { today: string }) {
  const t = useT();
  const language = useLanguage();
  const appCount = useModules().length;
  return (
    <div>
      <h2 className="text-2xl font-semibold">{t('Chào bạn')}</h2>
      <p className="mt-1 text-sm text-text-muted">
        {`${longDateLabel(today, language)} · ${t('{{count}} ứng dụng đang theo dõi', { count: appCount })}`}
      </p>
    </div>
  );
}

function TodayCards({ data, narrowDecision }: { data: TodayData; narrowDecision: ReactNode }) {
  const plan = data.plan.data ?? [];
  const foodLine = foodBudgetLine(data.budget.data?.lines ?? []);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="grid lg:col-span-3">
          <DinnerCard plan={plan} shopping={data.shopping.data} />
        </div>
        <div className="grid gap-4 lg:col-span-2">
          {narrowDecision}
          <SpendingCard
            spentTodayVnd={spentToday(data.summary.data?.dailyExpenseVnd ?? [])}
            monthTransactionCount={data.summary.data?.transactionCount ?? 0}
            foodLine={foodLine}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MealsCard plan={plan} />
        <ShoppingCard shopping={data.shopping.data} />
      </div>
    </>
  );
}

function useSideSections(data: TodayData) {
  const foodLine = foodBudgetLine(data.budget.data?.lines ?? []);
  const budgetDecision = decideFoodBudget(data.shopping.data, foodLine);
  const { pending, keep } = useKeptDecision(budgetDecision);
  const decision =
    pending && foodLine ? <DecisionSection decision={pending} foodLine={foodLine} onKeep={keep} /> : null;
  const rest = (
    <>
      <RecentNotificationsSection notifications={data.notifications.data ?? []} today={data.today} />
      <UpcomingBillsSection upcoming={upcomingBills(data.bills.data ?? [], data.today)} today={data.today} />
    </>
  );
  return { decision, rest };
}

function TodaySkeleton() {
  return (
    <div role="status" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Skeleton className="h-48" />
      <Skeleton className="h-48" />
    </div>
  );
}
