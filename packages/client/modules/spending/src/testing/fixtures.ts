import type { Bill, Category, Estimate, Goal, PaymentMethod, Transaction, Wallet } from '@alavo-daily/common/engine';

import { defaultPaymentMethods } from './fakePaymentMethods';

export const TODAY = '2026-10-09';

export interface FakeData {
  categories: Category[];
  wallets: Wallet[];
  paymentMethods: PaymentMethod[];
  estimates: Estimate[];
  transactions: Transaction[];
  goals: Goal[];
  bills: Bill[];
}

function category(id: string, name: string, icon: string, budgetVnd: number | null, isFixed = false): Category {
  return { id: `category-${id}`, name, icon, kind: 'expense', budgetVnd, isFixed, position: 0 };
}

function wallet(id: string, name: string, kind: Wallet['kind'], openingBalanceVnd: number): Wallet {
  return { id: `wallet-${id}`, name, kind, openingBalanceVnd, balanceVnd: openingBalanceVnd, position: 0 };
}

let sequence = 0;

export function transaction(day: string, title: string, categoryKey: string, walletKey: string, amountVnd: number, recurringRule: string | null = null): Transaction {
  sequence += 1;
  return {
    id: `tx-${sequence}`,
    occurredOn: day,
    title,
    categoryId: `category-${categoryKey}`,
    walletId: `wallet-${walletKey}`,
    amountVnd,
    note: '',
    recurringRule,
    createdAt: sequence,
    updatedAt: sequence,
  };
}

function octoberTransactions(): Transaction[] {
  const day = (n: number) => `2026-10-0${n}`;
  return [
    transaction(day(1), 'Cơm trưa văn phòng', 'food', 'cash', -60_000),
    transaction(day(1), 'Highlands Coffee', 'food', 'momo', -59_000),
    transaction(day(1), 'Internet FPT', 'bills', 'tcb', -230_000, 'monthly:1'),
    transaction(day(2), 'Bách Hoá Xanh', 'food', 'cash', -336_000),
    transaction(day(3), 'GrabFood', 'food', 'momo', -138_000),
    transaction(day(4), 'Nhà hàng — sinh nhật Mai', 'food', 'tcb', -1_150_000),
    transaction(day(5), 'Lương tháng 10', 'income', 'tcb', 28_000_000),
    transaction(day(5), 'Tiền thuê nhà', 'home', 'tcb', -7_500_000, 'monthly:5'),
    transaction(day(6), 'Phở Thìn', 'food', 'cash', -70_000),
    transaction(day(7), 'Cơm tấm Cô Ba', 'food', 'cash', -55_000),
    transaction(day(8), 'Co.opmart Nguyễn Đình Chiểu', 'food', 'tcb', -412_000),
    transaction(day(9), 'Highlands Coffee', 'food', 'momo', -65_000),
    transaction(day(9), 'Grab đi làm', 'transport', 'momo', -48_000),
  ];
}

function septemberTransactions(): Transaction[] {
  return [
    transaction('2026-09-12', 'Siêu thị', 'food', 'tcb', -1_000_000),
    transaction('2026-09-20', 'Lương tháng 9', 'income', 'tcb', 27_000_000),
  ];
}

export function createDemoData(): FakeData {
  sequence = 0;
  const income: Category = { ...category('income', 'Thu nhập', 'arrow-down-left', null), kind: 'income' };
  return {
    categories: [
      category('food', 'Ăn uống', 'fork-knife', 2_600_000),
      category('transport', 'Đi lại', 'car', 800_000),
      category('shopping', 'Mua sắm', 'shopping-bag', null),
      category('home', 'Nhà ở', 'house-line', null, true),
      category('bills', 'Hoá đơn', 'lightning', 1_200_000),
      income,
    ].map((item, index) => ({ ...item, position: index + 1 })),
    wallets: [
      wallet('tcb', 'Techcombank', 'bank', 10_000_000),
      wallet('momo', 'Ví MoMo', 'ewallet', 500_000),
      wallet('cash', 'Tiền mặt', 'cash', 300_000),
    ],
    paymentMethods: defaultPaymentMethods(),
    estimates: [],
    transactions: [...septemberTransactions(), ...octoberTransactions()],
    goals: [
      { id: 'goal-1', name: 'Quỹ khẩn cấp', icon: 'piggy-bank', targetVnd: 60_000_000, savedVnd: 38_500_000, dueOn: null },
      { id: 'goal-2', name: 'Du lịch Đà Lạt', icon: 'calendar-blank', targetVnd: 15_000_000, savedVnd: 9_200_000, dueOn: '2026-12-20' },
    ],
    bills: [
      { id: 'bill-1', title: 'Thẻ tín dụng Techcombank', icon: 'wallet', amountVnd: 2_340_000, dayOfMonth: 12, active: true },
      { id: 'bill-2', title: 'Internet FPT', icon: 'lightning', amountVnd: 230_000, dayOfMonth: 15, active: true },
      { id: 'bill-3', title: 'Netflix', icon: 'film-strip', amountVnd: 260_000, dayOfMonth: 18, active: false },
    ],
  };
}

export function createEmptyData(): FakeData {
  const demo = createDemoData();
  return { ...demo, transactions: [], goals: [], bills: [] };
}
