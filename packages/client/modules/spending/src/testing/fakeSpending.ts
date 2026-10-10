import { EngineCallError } from '@alavo-daily/common/engine';
import type {
  BudgetLine,
  BudgetStatus,
  Category,
  Goal,
  MonthSummary,
  NewTransaction,
  Transaction,
  TransactionFilter,
  Wallet,
} from '@alavo-daily/common/engine';
import { addMonths, daysInMonth, monthOf } from '@alavo-daily/common/format';
import type { Handlers } from '@alavo-daily/common/testing';

import { automationHandlers } from './fakeAutomation';
import { reorderCategories, settleCategoryTransactions } from './fakeCategories';
import { estimateHandlers } from './fakeEstimates';
import { paymentMethodHandlers } from './fakePaymentMethods';
import type { FakeData } from './fixtures';

function validation(message: string): EngineCallError {
  return new EngineCallError('validation', message);
}

function notFound(what: string): EngineCallError {
  return new EngineCallError('not_found', `${what} not found`);
}

function requireText(field: string, value: string): string {
  if (value.trim() === '') throw validation(`${field} must not be empty`);
  return value.trim();
}

function matchesFilter(item: Transaction, filter: TransactionFilter, data: FakeData): boolean {
  const kind = data.categories.find((entry) => entry.id === item.categoryId)?.kind;
  const query = filter.query?.toLowerCase();
  return (
    (!filter.month || monthOf(item.occurredOn) === filter.month) &&
    (!filter.categoryId || item.categoryId === filter.categoryId) &&
    (!filter.walletId || item.walletId === filter.walletId) &&
    (!filter.kind || kind === filter.kind) &&
    (!filter.recurringOnly || item.recurringRule !== null || Boolean(item.recurringSourceId)) &&
    (!query || `${item.title} ${item.note}`.toLowerCase().includes(query))
  );
}

function newestFirst(a: Transaction, b: Transaction): number {
  return b.occurredOn.localeCompare(a.occurredOn) || b.createdAt - a.createdAt;
}

function checkSign(data: FakeData, categoryId: string, amountVnd: number): void {
  const category = data.categories.find((entry) => entry.id === categoryId);
  if (!category) throw validation(`category ${categoryId} does not exist`);
  if (amountVnd === 0) throw validation('amountVnd must not be zero');
  if (category.kind === 'expense' && amountVnd > 0) throw validation('an expense amount must be negative');
  if (category.kind === 'income' && amountVnd < 0) throw validation('an income amount must be positive');
}

function withBalance(data: FakeData, wallet: Wallet): Wallet {
  const moved = data.transactions
    .filter((item) => item.walletId === wallet.id)
    .reduce((sum, item) => sum + item.amountVnd, 0);
  return { ...wallet, balanceVnd: wallet.openingBalanceVnd + moved };
}

function expenseIn(data: FakeData, month: string): number {
  return -data.transactions
    .filter((item) => monthOf(item.occurredOn) === month && item.amountVnd < 0)
    .reduce((sum, item) => sum + item.amountVnd, 0);
}

function dailyExpenses(data: FakeData, month: string, today: string): number[] {
  const length = month === monthOf(today) ? Number(today.slice(8)) : daysInMonth(month);
  const fixed = new Set(data.categories.filter((entry) => entry.isFixed).map((entry) => entry.id));
  const days = Array.from({ length }, () => 0);
  for (const item of data.transactions) {
    const index = Number(item.occurredOn.slice(8)) - 1;
    const counts = monthOf(item.occurredOn) === month && item.amountVnd < 0 && !fixed.has(item.categoryId);
    if (counts && index < length) days[index] = (days[index] ?? 0) - item.amountVnd;
  }
  return days;
}

function monthSummary(data: FakeData, month: string, today: string): MonthSummary {
  const inMonth = data.transactions.filter((item) => monthOf(item.occurredOn) === month);
  const incomeVnd = inMonth.filter((item) => item.amountVnd > 0).reduce((sum, item) => sum + item.amountVnd, 0);
  const expenseVnd = expenseIn(data, month);
  const previousExpenseVnd = expenseIn(data, addMonths(month, -1));
  return {
    month,
    incomeVnd,
    expenseVnd,
    netVnd: incomeVnd - expenseVnd,
    previousExpenseVnd,
    expenseDeltaPct: previousExpenseVnd === 0 ? null : (expenseVnd - previousExpenseVnd) / previousExpenseVnd,
    totalBalanceVnd: data.wallets.reduce((sum, item) => sum + withBalance(data, item).balanceVnd, 0),
    dailyExpenseVnd: dailyExpenses(data, month, today),
    transactionCount: inMonth.length,
  };
}

function budgetLine(data: FakeData, category: Category, month: string): BudgetLine | null {
  if (category.kind !== 'expense' || category.budgetVnd === null) return null;
  const spentVnd = -data.transactions
    .filter((item) => item.categoryId === category.id && monthOf(item.occurredOn) === month && item.amountVnd < 0)
    .reduce((sum, item) => sum + item.amountVnd, 0);
  const pct = spentVnd / category.budgetVnd;
  return {
    categoryId: category.id,
    name: category.name,
    icon: category.icon,
    budgetVnd: category.budgetVnd,
    spentVnd,
    pct,
    remainingVnd: category.budgetVnd - spentVnd,
    tone: pct > 1 ? 'over' : pct >= 0.85 ? 'warn' : 'normal',
  };
}

function budgetStatus(data: FakeData, month: string, today: string): BudgetStatus {
  const lines = data.categories.flatMap((category) => budgetLine(data, category, month) ?? []);
  const totalBudgetVnd = lines.reduce((sum, line) => sum + line.budgetVnd, 0);
  const totalSpentVnd = lines.reduce((sum, line) => sum + line.spentVnd, 0);
  const daysLeft = month === monthOf(today) ? daysInMonth(month) - Number(today.slice(8)) : 0;
  const totalRemainingVnd = totalBudgetVnd - totalSpentVnd;
  const perDayVnd = daysLeft > 0 ? Math.round(totalRemainingVnd / daysLeft) : 0;
  return { month, lines, totalBudgetVnd, totalSpentVnd, totalRemainingVnd, daysLeft, perDayVnd };
}

let counter = 0;

function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-new-${counter}`;
}

function transactionHandlers(data: FakeData): Handlers {
  return {
    'spending.list_transactions': (filter) => {
      const matches = data.transactions.filter((item) => matchesFilter(item, filter ?? {}, data)).sort(newestFirst);
      return filter?.limit ? matches.slice(0, filter.limit) : matches;
    },
    'spending.get_transaction': ({ id }) => {
      const found = data.transactions.find((item) => item.id === id);
      if (!found) throw notFound('transaction');
      return found;
    },
    'spending.record_transaction': (input: NewTransaction) => {
      requireText('title', input.title);
      checkSign(data, input.categoryId, input.amountVnd);
      const created: Transaction = {
        note: '',
        recurringRule: null,
        ...input,
        title: input.title.trim(),
        id: nextId('tx'),
        createdAt: 1000 + counter,
        updatedAt: 1000 + counter,
      };
      data.transactions.push(created);
      return created;
    },
    'spending.update_transaction': ({ id, ...changes }) => {
      const index = data.transactions.findIndex((item) => item.id === id);
      const current = data.transactions[index];
      if (!current) throw notFound('transaction');
      const next = { ...current, ...changes };
      requireText('title', next.title);
      checkSign(data, next.categoryId, next.amountVnd);
      data.transactions[index] = next;
      return next;
    },
    'spending.delete_transaction': ({ id }) => {
      data.transactions = data.transactions.filter((item) => item.id !== id);
      return {};
    },
    'spending.month_summary': ({ month, today }) => monthSummary(data, month, today),
    'spending.budget_status': ({ month, today }) => budgetStatus(data, month, today),
  };
}

function categoryHandlers(data: FakeData): Handlers {
  return {
    'spending.list_categories': (filter) =>
      data.categories
        .filter((item) => !filter?.kind || item.kind === filter.kind)
        .sort((a, b) => a.position - b.position),
    'spending.create_category': (input) => {
      const name = requireText('name', input.name);
      if (input.budgetVnd !== undefined && input.budgetVnd !== null && input.budgetVnd <= 0) {
        throw validation('budgetVnd must be greater than zero');
      }
      const created: Category = {
        id: nextId('category'),
        name,
        icon: input.icon,
        kind: input.kind,
        budgetVnd: input.budgetVnd ?? null,
        isFixed: false,
        position: 99,
      };
      data.categories.push(created);
      return created;
    },
    'spending.update_category': ({ id, ...changes }) => {
      const index = data.categories.findIndex((item) => item.id === id);
      const current = data.categories[index];
      if (!current) throw notFound('category');
      const next = { ...current, ...changes };
      data.categories[index] = next;
      return next;
    },
    'spending.delete_category': ({ id, moveTransactionsTo, deleteTransactions }) => {
      if (data.transactions.some((item) => item.categoryId === id)) {
        settleCategoryTransactions(data, id, moveTransactionsTo, deleteTransactions);
      }
      data.categories = data.categories.filter((item) => item.id !== id);
      return {};
    },
    'spending.reorder_categories': ({ ids }) => reorderCategories(data, ids),
  };
}

function cleanAccountNumber(number: string | null | undefined): string | null {
  const compact = (number ?? '').replace(/\s+/g, '');
  return compact === '' ? null : compact;
}

function walletHandlers(data: FakeData): Handlers {
  return {
    'spending.list_wallets': () => data.wallets.map((item) => withBalance(data, item)),
    'spending.create_wallet': (input) => {
      const created: Wallet = {
        ...input,
        name: requireText('name', input.name),
        id: nextId('wallet'),
        balanceVnd: input.openingBalanceVnd,
        position: 99,
        accountNumber: cleanAccountNumber(input.accountNumber),
      };
      data.wallets.push(created);
      return created;
    },
    'spending.update_wallet': ({ id, ...changes }) => {
      const index = data.wallets.findIndex((item) => item.id === id);
      const current = data.wallets[index];
      if (!current) throw notFound('wallet');
      const next = { ...current, ...changes };
      if (changes.accountNumber !== undefined) next.accountNumber = cleanAccountNumber(changes.accountNumber);
      requireText('name', next.name);
      data.wallets[index] = next;
      return withBalance(data, next);
    },
    'spending.delete_wallet': ({ id, moveTransactionsTo, deleteTransactions }) => {
      if (data.transactions.some((item) => item.walletId === id)) {
        settleWalletTransactions(data, id, moveTransactionsTo, deleteTransactions);
      }
      data.wallets = data.wallets.filter((item) => item.id !== id);
      return {};
    },
  };
}

function settleWalletTransactions(
  data: FakeData,
  id: string,
  moveTransactionsTo: string | undefined,
  deleteTransactions: boolean | undefined,
): void {
  if (moveTransactionsTo && deleteTransactions) throw validation('move the transactions or delete them, not both');
  if (moveTransactionsTo) {
    if (moveTransactionsTo === id) throw validation('choose a different wallet');
    data.transactions = data.transactions.map((item) =>
      item.walletId === id ? { ...item, walletId: moveTransactionsTo } : item,
    );
  } else if (deleteTransactions) {
    data.transactions = data.transactions.filter((item) => item.walletId !== id);
  } else {
    throw validation('wallet still has transactions');
  }
}

function goalHandlers(data: FakeData): Handlers {
  const find = (id: string): number => {
    const index = data.goals.findIndex((item) => item.id === id);
    if (index < 0) throw notFound('goal');
    return index;
  };
  return {
    'spending.list_goals': () => data.goals,
    'spending.create_goal': (input) => {
      requireText('name', input.name);
      if (input.targetVnd <= 0) throw validation('targetVnd must be greater than zero');
      const created: Goal = {
        id: nextId('goal'),
        name: input.name.trim(),
        icon: input.icon,
        targetVnd: input.targetVnd,
        savedVnd: input.savedVnd ?? 0,
        dueOn: input.dueOn ?? null,
      };
      data.goals.push(created);
      return created;
    },
    'spending.update_goal': ({ id, ...changes }) => {
      const index = find(id);
      const next = { ...(data.goals[index] as Goal), ...changes };
      data.goals[index] = next;
      return next;
    },
    'spending.contribute_goal': ({ id, amountVnd }) => {
      if (amountVnd <= 0) throw validation('amountVnd must be greater than zero');
      const index = find(id);
      const goal = data.goals[index] as Goal;
      const next = { ...goal, savedVnd: goal.savedVnd + amountVnd };
      data.goals[index] = next;
      return next;
    },
    'spending.delete_goal': ({ id }) => {
      data.goals.splice(find(id), 1);
      return {};
    },
  };
}

function billHandlers(data: FakeData): Handlers {
  return {
    'spending.list_bills': () => [...data.bills].sort((a, b) => a.dayOfMonth - b.dayOfMonth),
    'spending.save_bill': (input) => {
      requireText('title', input.title);
      if (input.dayOfMonth < 1 || input.dayOfMonth > 31) throw validation('dayOfMonth must be between 1 and 31');
      const existing = data.bills.findIndex((item) => item.id === input.id);
      const saved = { active: true, ...(data.bills[existing] ?? {}), ...input, id: input.id ?? nextId('bill') };
      if (existing >= 0) data.bills[existing] = saved;
      else data.bills.push(saved);
      return saved;
    },
    'spending.delete_bill': ({ id }) => {
      data.bills = data.bills.filter((item) => item.id !== id);
      return {};
    },
  };
}

export function spendingHandlers(data: FakeData): Handlers {
  return {
    ...transactionHandlers(data),
    ...categoryHandlers(data),
    ...walletHandlers(data),
    ...paymentMethodHandlers(data),
    ...estimateHandlers(data),
    ...goalHandlers(data),
    ...billHandlers(data),
    ...automationHandlers(data),
  };
}
