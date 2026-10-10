import { screen } from '@testing-library/react';
import { matchPath } from 'react-router';
import { describe, expect, it } from 'vitest';

import { spendingManifest } from './index';
import { freezeToday, renderSpending } from './testing/renderSpending';

freezeToday();

describe('spendingManifest', () => {
  it('keeps the identity the hub depends on', () => {
    expect(spendingManifest.id).toBe('spending');
    expect(spendingManifest.views.map((view) => view.path)).toEqual([
      '/spending/overview',
      '/spending/accounts',
      '/spending/transactions',
      '/spending/reports',
      '/spending/budgets',
      '/spending/goals',
      '/spending/estimates',
      '/spending/import',
    ]);
    expect(spendingManifest.quickActions?.map((action) => action.path)).toEqual(['/spending/transactions?new=1']);
  });

  it('has a route for every view, with the selected record in an optional segment', () => {
    for (const view of spendingManifest.views) {
      expect(spendingManifest.routes.some((route) => matchPath(route.path, view.path))).toBe(true);
    }
    expect(spendingManifest.routes.some((route) => matchPath(route.path, '/spending/transactions/abc'))).toBe(true);
  });

  it('draws no route without the app frame', () => {
    expect(spendingManifest.routes.every((route) => !route.fullscreen)).toBe(true);
  });

  it('contributes the wallet list to the sidebar', () => {
    expect(spendingManifest.sidebarExtra).toBeDefined();
  });

  it('keeps budgets and goals out of the bottom tab bar, behind the more screen', () => {
    const tabs = spendingManifest.views.filter((view) => view.tab).map((view) => view.id);
    expect(tabs).toEqual(['overview', 'accounts', 'reports']);
    expect(spendingManifest.views.find((view) => view.id === 'budgets')?.more).toBe(true);
  });

  it('has a background component for recurring transactions and reminders', () => {
    expect(spendingManifest.background).toBeDefined();
  });

  it('has a route for the statement import, which is reached from the transactions header', () => {
    expect(spendingManifest.routes.some((route) => matchPath(route.path, '/spending/import'))).toBe(true);
  });
});

describe('new transaction parameter', () => {
  it.each(['/spending/overview', '/spending/transactions', '/spending/budgets', '/spending/goals', '/spending/reports'])(
    'opens the add dialog on %s',
    async (path) => {
      renderSpending({ route: `${path}?new=1` });
      expect(await screen.findByRole('dialog', { name: 'Thêm giao dịch' })).toBeInTheDocument();
    },
  );

  it('does not open the dialog without the parameter', async () => {
    renderSpending({ route: '/spending/overview' });
    await screen.findByText('Tổng số dư');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('screen titles reported to the shell', () => {
  it.each([
    ['/spending/overview', 'Tổng quan'],
    ['/spending/transactions', 'Giao dịch'],
    ['/spending/budgets', 'Ngân sách'],
    ['/spending/goals', 'Mục tiêu'],
    ['/spending/reports', 'Báo cáo'],
    ['/spending/import', 'Nhập sao kê'],
  ])('%s is titled %s', async (path, title) => {
    const { screenInfo } = renderSpending({ route: path });
    await screen.findByRole('main', { name: 'Ngăn làm việc' });
    expect(screenInfo.current?.title).toBe(title);
  });
});
