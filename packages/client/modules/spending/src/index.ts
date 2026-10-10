import type { ModuleManifest } from '@alavo-daily/common/modules';

import { spendingMoreSections } from './more/moreSections';
import { SpendingBackground } from './reminders';
import { spendingRoutes } from './routes';
import { WalletsSidebar } from './wallets';

export { rememberKeptBudget } from './overview';

export const spendingManifest: ModuleManifest = {
  id: 'spending',
  name: 'Chi tiêu',
  icon: 'wallet',
  description: 'Thu chi, ngân sách, mục tiêu',
  views: [
    { id: 'overview', label: 'Tổng quan', icon: 'squares-four', path: '/spending/overview', tab: true },
    { id: 'accounts', label: 'Tài khoản', icon: 'wallet', path: '/spending/accounts', tab: true },
    { id: 'transactions', label: 'Ghi chép', icon: 'receipt', path: '/spending/transactions' },
    { id: 'reports', label: 'Báo cáo', icon: 'chart-bar', path: '/spending/reports', tab: true },
    { id: 'budgets', label: 'Ngân sách', icon: 'chart-pie-slice', path: '/spending/budgets', more: true },
    { id: 'goals', label: 'Mục tiêu', icon: 'target', path: '/spending/goals', more: true },
    { id: 'estimates', label: 'Dự toán', icon: 'calculator', path: '/spending/estimates', more: true },
    { id: 'import', label: 'Nhập sao kê', icon: 'upload-simple', path: '/spending/import', more: true },
  ],
  more: { sections: spendingMoreSections },
  quickActions: [
    {
      id: 'new-transaction',
      label: 'Giao dịch chi tiêu',
      tabLabel: 'Ghi chép',
      icon: 'wallet',
      path: '/spending/transactions?new=1',
    },
  ],
  routes: spendingRoutes,
  sidebarExtra: WalletsSidebar,
  background: SpendingBackground,
};
