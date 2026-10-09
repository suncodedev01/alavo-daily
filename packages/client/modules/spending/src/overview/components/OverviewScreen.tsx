import { useT } from '@alavo-daily/common';
import { Card, useLayout } from '@alavo-daily/design-system';

import { useMonthParam } from '../../month';
import { LinkButton } from '../../navigation';
import { SpendingScreen } from '../../spending-screen';
import { DecisionSection } from './DecisionSection';
import { MonthComparisonSection, UpcomingBillsSection } from './DockSections';
import { BudgetsSummaryCard, DailySpendingCard, GoalsSummaryCard, RecentTransactionsCard } from './OverviewCards';
import { OverviewStats } from './OverviewStats';
import { useDecision } from '../hooks/useDecision';

export function OverviewScreen() {
  const t = useT();
  const scope = useMonthParam();
  const narrow = useLayout() === 'narrow';
  const decision = useDecision(scope);
  const { month, today } = scope;

  const dock = (
    <>
      {decision ? <DecisionSection decision={decision} /> : null}
      <UpcomingBillsSection today={today} />
      <MonthComparisonSection month={month} today={today} />
    </>
  );

  return (
    <SpendingScreen title={t('Tổng quan')} monthParam={scope} dock={narrow ? undefined : dock}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-9">
        <OverviewStats month={month} today={today} />
      </div>
      {narrow && decision ? (
        <Card padding="none">
          <DecisionSection decision={decision} />
        </Card>
      ) : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DailySpendingCard month={month} today={today} isCurrentMonth={scope.isCurrentMonth} />
        <BudgetsSummaryCard month={month} today={today} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentTransactionsCard month={month} />
        <GoalsSummaryCard />
      </div>
      {narrow ? (
        <Card padding="none">
          <UpcomingBillsSection today={today} />
          <MonthComparisonSection month={month} today={today} />
        </Card>
      ) : null}
      {narrow ? (
        <LinkButton to="/spending/reports" variant="outline" leadingIcon="chart-bar">
          {t('Xem báo cáo')}
        </LinkButton>
      ) : null}
    </SpendingScreen>
  );
}
