import type { ModuleManifest } from '@alavo-daily/common/modules';

import { SpendingBackground } from './reminders';
import { spendingRoutes } from './routes';
import { WalletsSidebar } from './wallets';

export const spendingManifest: ModuleManifest = {
  id: 'spending',
  name: 'Chi tiêu',
  icon: 'wallet',
  description: 'Thu chi, ngân sách, mục tiêu',
  views: [
    { id: 'overview', label: 'Tổng quan', icon: 'squares-four', path: '/spending/overview', tab: true },
    { id: 'transactions', label: 'Giao dịch', icon: 'receipt', path: '/spending/transactions', tab: true },
    { id: 'budgets', label: 'Ngân sách', icon: 'chart-pie-slice', path: '/spending/budgets', tab: true },
    { id: 'goals', label: 'Mục tiêu', icon: 'target', path: '/spending/goals', tab: true },
    { id: 'reports', label: 'Báo cáo', icon: 'chart-bar', path: '/spending/reports' },
  ],
  quickActions: [
    {
      id: 'new-transaction',
      label: 'Giao dịch chi tiêu',
      icon: 'wallet',
      path: '/spending/transactions?new=1',
    },
  ],
  routes: spendingRoutes,
  sidebarExtra: WalletsSidebar,
  background: SpendingBackground,
};
