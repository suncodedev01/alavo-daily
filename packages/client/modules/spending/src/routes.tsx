import type { ModuleRoute } from '@alavo-daily/common/modules';

import { BudgetsScreen } from './budgets';
import { EstimateDetailScreen, EstimatesScreen } from './estimates';
import { GoalsScreen } from './goals';
import { OverviewScreen } from './overview';
import { ReportsScreen } from './reports';
import { ImportStatementScreen } from './statement-import';
import { TransactionsScreen } from './transactions';
import { AccountsScreen } from './wallets';

export const spendingRoutes: ModuleRoute[] = [
  { path: '/spending/overview', element: <OverviewScreen /> },
  { path: '/spending/accounts', element: <AccountsScreen /> },
  { path: '/spending/transactions/:id?', element: <TransactionsScreen /> },
  { path: '/spending/budgets', element: <BudgetsScreen /> },
  { path: '/spending/goals', element: <GoalsScreen /> },
  { path: '/spending/estimates', element: <EstimatesScreen /> },
  { path: '/spending/estimates/:id', element: <EstimateDetailScreen /> },
  { path: '/spending/reports', element: <ReportsScreen /> },
  { path: '/spending/import', element: <ImportStatementScreen /> },
];
