import { Screen, type ScreenProps } from '@alavo-daily/common/shell';
import { PageColumn } from '@alavo-daily/design-system';
import type { ReactNode } from 'react';

import { MonthSwitcher, type MonthParam } from '../../month';
import { AddTransactionButton, AddTransactionHost } from '../../transaction-form';

export interface SpendingScreenProps extends Omit<ScreenProps, 'actions'> {
  monthParam?: MonthParam;
  primaryAction?: ReactNode;
}

export function SpendingScreen({ monthParam, primaryAction, children, ...screen }: SpendingScreenProps) {
  const actions = (
    <>
      {monthParam ? <MonthSwitcher month={monthParam.month} onChange={monthParam.setMonth} /> : null}
      {primaryAction === undefined ? <AddTransactionButton /> : primaryAction}
    </>
  );
  return (
    <Screen {...screen} actions={actions}>
      <PageColumn>{children}</PageColumn>
      <AddTransactionHost />
    </Screen>
  );
}
