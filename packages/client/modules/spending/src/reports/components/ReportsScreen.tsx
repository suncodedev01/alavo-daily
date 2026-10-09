import { useEngineQuery, type CategoryKind, type SpendingReport } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { EmptyState } from '@alavo-daily/design-system';
import { useState } from 'react';

import { Loadable, SkeletonRows } from '../../query-state';
import { SpendingScreen } from '../../spending-screen';
import { useToday } from '../../today';
import { useReportRange } from '../hooks/useReportRange';
import { CategoryShareCard } from './CategoryShareCard';
import { CategoryTable } from './CategoryTable';
import { ExportCsvButton } from './ExportCsvButton';
import { MonthlyCard } from './MonthlyCard';
import { RangeBar } from './RangeBar';
import { ReportStats } from './ReportStats';

export function ReportsScreen() {
  const t = useT();
  const today = useToday();
  const state = useReportRange(today);
  const report = useEngineQuery('spending.report', state.range);
  return (
    <SpendingScreen title={t('Báo cáo')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <RangeBar state={state} today={today} />
        <ExportCsvButton range={state.range} />
      </div>
      <Loadable query={report} skeleton={<SkeletonRows count={3} className="h-40 w-full" />}>
        {(data) => (data.transactionCount === 0 ? <EmptyReport /> : <ReportBody report={data} />)}
      </Loadable>
    </SpendingScreen>
  );
}

function EmptyReport() {
  const t = useT();
  return (
    <EmptyState
      icon="chart-bar"
      title={t('Chưa có giao dịch trong khoảng này')}
      description={t('Chọn khoảng thời gian khác hoặc ghi một giao dịch mới.')}
    />
  );
}

function ReportBody({ report }: { report: SpendingReport }) {
  const [kind, setKind] = useState<CategoryKind>('expense');
  return (
    <>
      <ReportStats report={report} />
      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryShareCard categories={report.categories} kind={kind} onKindChange={setKind} />
        <MonthlyCard months={report.months} />
      </div>
      <CategoryTable categories={report.categories} kind={kind} />
    </>
  );
}
