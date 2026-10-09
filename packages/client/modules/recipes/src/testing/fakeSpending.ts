import type { BudgetLine, Category, Handlers, Transaction, Wallet } from './types';

export const FOOD_CATEGORY: Category = {
  id: 'cat-food',
  name: 'Ăn uống',
  icon: 'fork-knife',
  kind: 'expense',
  budgetVnd: 1_000_000,
  isFixed: false,
  position: 0,
};

export const OTHER_CATEGORY: Category = {
  id: 'cat-other',
  name: 'Khác',
  icon: 'tag',
  kind: 'expense',
  budgetVnd: null,
  isFixed: false,
  position: 1,
};

export const WALLETS: Wallet[] = [
  { id: 'w-cash', name: 'Tiền mặt', kind: 'cash', openingBalanceVnd: 0, balanceVnd: 0, position: 0 },
  { id: 'w-bank', name: 'Ngân hàng', kind: 'bank', openingBalanceVnd: 0, balanceVnd: 0, position: 1 },
];

export interface FoodBudget {
  budgetVnd: number;
  spentVnd: number;
}

export function foodLine(budget: FoodBudget): BudgetLine {
  const pct = budget.spentVnd / budget.budgetVnd;
  return {
    categoryId: FOOD_CATEGORY.id,
    name: FOOD_CATEGORY.name,
    icon: FOOD_CATEGORY.icon,
    budgetVnd: budget.budgetVnd,
    spentVnd: budget.spentVnd,
    pct,
    remainingVnd: budget.budgetVnd - budget.spentVnd,
    tone: pct > 1 ? 'over' : pct >= 0.85 ? 'warn' : 'normal',
  };
}

export function spendingHandlers(budget: FoodBudget | null): Handlers {
  const lines = budget ? [foodLine(budget)] : [];
  return {
    'spending.budget_status': () => ({
      month: '2026-10',
      lines,
      totalBudgetVnd: budget?.budgetVnd ?? 0,
      totalSpentVnd: budget?.spentVnd ?? 0,
      totalRemainingVnd: (budget?.budgetVnd ?? 0) - (budget?.spentVnd ?? 0),
      daysLeft: 22,
      perDayVnd: 0,
    }),
    'spending.list_wallets': () => WALLETS,
    'spending.list_categories': () => [OTHER_CATEGORY, FOOD_CATEGORY],
    'spending.update_category': ({ id, budgetVnd }) => ({ ...FOOD_CATEGORY, id, budgetVnd: budgetVnd ?? null }),
  };
}

export function loggedTransaction(amountVnd: number): Transaction {
  return {
    id: 'tx-1',
    occurredOn: '2026-10-09',
    title: 'Đi chợ',
    categoryId: FOOD_CATEGORY.id,
    walletId: WALLETS[0]?.id ?? '',
    amountVnd: -amountVnd,
    note: '',
    recurringRule: null,
    createdAt: 1,
    updatedAt: 1,
  };
}
