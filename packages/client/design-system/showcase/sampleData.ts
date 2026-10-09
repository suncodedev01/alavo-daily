export type Transaction = { id: number; title: string; category: string; icon: string; wallet: string; amount: number };

export const TRANSACTIONS: Transaction[] = [
  { id: 1, title: 'Highlands Coffee', category: 'Ăn uống', icon: 'fork-knife', wallet: 'Ví MoMo', amount: -65000 },
  { id: 2, title: 'Grab đi làm', category: 'Đi lại', icon: 'car', wallet: 'Ví MoMo', amount: -48000 },
  { id: 3, title: 'Co.opmart Nguyễn Đình Chiểu', category: 'Ăn uống', icon: 'fork-knife', wallet: 'Techcombank', amount: -412000 },
  { id: 4, title: 'Netflix', category: 'Giải trí', icon: 'film-strip', wallet: 'Techcombank', amount: -260000 },
  { id: 5, title: 'Freelance — thiết kế logo', category: 'Thu nhập', icon: 'arrow-down-left', wallet: 'Techcombank', amount: 4500000 },
];

export type BudgetLine = { name: string; icon: string; spent: number; budget: number };

export const BUDGETS: BudgetLine[] = [
  { name: 'Ăn uống', icon: 'fork-knife', spent: 2290000, budget: 2600000 },
  { name: 'Đi lại', icon: 'car', spent: 337000, budget: 800000 },
  { name: 'Mua sắm', icon: 'shopping-bag', spent: 1780000, budget: 1500000 },
  { name: 'Giải trí', icon: 'film-strip', spent: 319000, budget: 400000 },
];

const VND = new Intl.NumberFormat('vi-VN');

export function formatVnd(amount: number): string {
  return `${VND.format(Math.abs(amount))} ₫`;
}

export function formatSigned(amount: number): string {
  return `${amount > 0 ? '+' : '−'}${formatVnd(amount)}`;
}
