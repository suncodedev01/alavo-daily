import type { ModuleRoute } from '@alavo-daily/common/modules';

import { BudgetsScreen } from './budgets';
import { GoalsScreen } from './goals';
import { OverviewScreen } from './overview';
import { ReportsScreen } from './reports';
import { ImportStatementScreen } from './statement-import';
import { TransactionsScreen } from './transactions';

export const spendingRoutes: ModuleRoute[] = [
  { path: '/spending/overview', element: <OverviewScreen /> },
  { path: '/spending/transactions/:id?', element: <TransactionsScreen /> },
  { path: '/spending/budgets', element: <BudgetsScreen /> },
  { path: '/spending/goals', element: <GoalsScreen /> },
  { path: '/spending/reports', element: <ReportsScreen /> },
  { path: '/spending/import', element: <ImportStatementScreen /> },
];
