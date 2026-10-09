import { useT } from '@alavo-daily/common';
import { Card, EmptyState, Icon, useLayout } from '@alavo-daily/design-system';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import { useMonthParam } from '../../month';
import { SpendingScreen } from '../../spending-screen';
import { ImportStatementButton } from '../../statement-import';
import { AddTransactionButton } from '../../transaction-form';
import { transactionListPath } from '../../transaction-model';
import { TransactionDetail } from './TransactionDetail';
import { TransactionDock } from './TransactionDock';
import { TransactionListPane } from './TransactionListPane';
import type { ListCriteria } from '../types';

const INITIAL_CRITERIA: ListCriteria = { filter: 'all', query: '' };

export function TransactionsScreen() {
  const t = useT();
  const { id = null } = useParams();
  const monthParam = useMonthParam();
  const layout = useLayout();
  const [criteria, setCriteria] = useState(INITIAL_CRITERIA);
  const narrow = layout === 'narrow';

  const list = (
    <TransactionListPane month={monthParam.month} selectedId={id} criteria={criteria} onCriteriaChange={setCriteria} />
  );
  return (
    <SpendingScreen
      title={t('Giao dịch')}
      monthParam={monthParam}
      primaryAction={<HeaderActions />}
      list={list}
      listLabel={t('Danh sách giao dịch')}
      narrowShows={id ? 'main' : 'list'}
      dock={id && !narrow ? <TransactionDock id={id} /> : undefined}
    >
      {id ? <SelectedTransaction id={id} narrow={narrow} /> : <NothingSelected />}
    </SpendingScreen>
  );
}

function HeaderActions() {
  return (
    <>
      <ImportStatementButton />
      <AddTransactionButton />
    </>
  );
}

function NothingSelected() {
  const t = useT();
  return (
    <EmptyState
      icon="receipt"
      title={t('Chọn một giao dịch')}
      description={t('Chọn một dòng trong danh sách để xem chi tiết, sửa hoặc xoá.')}
    />
  );
}

function SelectedTransaction({ id, narrow }: { id: string; narrow: boolean }) {
  const t = useT();
  const [params] = useSearchParams();
  return (
    <div className="grid gap-4">
      {narrow ? (
        <Link
          to={transactionListPath(params.get('month'))}
          className="focus-ring inline-flex min-h-11 items-center gap-1 justify-self-start text-sm font-medium text-accent-fg"
        >
          <Icon name="caret-left" size="lg" />
          {t('Giao dịch')}
        </Link>
      ) : null}
      <TransactionDetail id={id} />
      {narrow ? (
        <Card padding="none" className="mx-auto w-full max-w-160">
          <TransactionDock id={id} />
        </Card>
      ) : null}
    </div>
  );
}
