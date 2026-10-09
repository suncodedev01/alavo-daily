import type {
  CategoryShare,
  MonthBar,
  SpendingReport,
  StatementImportRow,
  Transaction,
} from '@alavo-daily/common/engine';
import { EngineCallError } from '@alavo-daily/common/engine';
import type { Handlers } from '@alavo-daily/common/testing';

import type { FakeData } from './fixtures';

function inRange(item: Transaction, from: string, to: string): boolean {
  return item.occurredOn >= from && item.occurredOn <= to;
}

function categoryShares(data: FakeData, items: Transaction[]): CategoryShare[] {
  const totals = new Map<string, { total: number; count: number }>();
  for (const item of items) {
    const entry = totals.get(item.categoryId) ?? { total: 0, count: 0 };
    totals.set(item.categoryId, { total: entry.total + Math.abs(item.amountVnd), count: entry.count + 1 });
  }
  const kindTotal = (kind: string) =>
    [...totals.entries()]
      .filter(([id]) => data.categories.find((category) => category.id === id)?.kind === kind)
      .reduce((sum, [, entry]) => sum + entry.total, 0);
  return [...totals.entries()]
    .flatMap(([id, entry]) => {
      const category = data.categories.find((candidate) => candidate.id === id);
      if (!category) return [];
      const whole = kindTotal(category.kind);
      const share = whole === 0 ? 0 : entry.total / whole;
      const { name, icon, kind } = category;
      return [{ categoryId: id, name, icon, kind, totalVnd: entry.total, share, transactionCount: entry.count }];
    })
    .sort((a, b) => b.totalVnd - a.totalVnd);
}

function monthsOf(from: string, to: string): string[] {
  const months: string[] = [];
  let [year = 0, month = 1] = from.slice(0, 7).split('-').map(Number);
  while (`${year}-${String(month).padStart(2, '0')}` <= to.slice(0, 7)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    [year, month] = month === 12 ? [year + 1, 1] : [year, month + 1];
  }
  return months;
}

function monthBars(items: Transaction[], from: string, to: string): MonthBar[] {
  return monthsOf(from, to).map((month) => {
    const inMonth = items.filter((item) => item.occurredOn.startsWith(month));
    const incomeVnd = inMonth.filter((item) => item.amountVnd > 0).reduce((sum, item) => sum + item.amountVnd, 0);
    const expenseVnd = -inMonth.filter((item) => item.amountVnd < 0).reduce((sum, item) => sum + item.amountVnd, 0);
    return { month, incomeVnd, expenseVnd, netVnd: incomeVnd - expenseVnd };
  });
}

function report(data: FakeData, from: string, to: string): SpendingReport {
  if (from > to) throw new EngineCallError('validation', 'from must not be after to');
  const items = data.transactions.filter((item) => inRange(item, from, to));
  const incomeVnd = items.filter((item) => item.amountVnd > 0).reduce((sum, item) => sum + item.amountVnd, 0);
  const expenseVnd = -items.filter((item) => item.amountVnd < 0).reduce((sum, item) => sum + item.amountVnd, 0);
  return {
    from,
    to,
    incomeVnd,
    expenseVnd,
    netVnd: incomeVnd - expenseVnd,
    transactionCount: items.length,
    categories: categoryShares(data, items),
    months: monthBars(items, from, to),
  };
}

function csvOf(data: FakeData, from: string, to: string): { csv: string; rowCount: number } {
  const items = data.transactions
    .filter((item) => inRange(item, from, to))
    .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));
  const name = (list: { id: string; name: string }[], id: string) => list.find((entry) => entry.id === id)?.name ?? '';
  const lines = items.map((item) =>
    [item.occurredOn, item.title, name(data.categories, item.categoryId), name(data.wallets, item.walletId), item.amountVnd, item.note].join(
      ',',
    ),
  );
  return { csv: ['date,title,category,wallet,amount_vnd,note', ...lines].join('\r\n') + '\r\n', rowCount: items.length };
}

function duplicateKey(item: { occurredOn: string; amountVnd: number; title: string }): string {
  return `${item.occurredOn}|${item.amountVnd}|${item.title}`;
}

function importRows(
  data: FakeData,
  walletId: string,
  rows: StatementImportRow[],
): { imported: number; skippedDuplicates: number } {
  const known = new Map<string, number>();
  for (const item of data.transactions.filter((entry) => entry.walletId === walletId)) {
    known.set(duplicateKey(item), (known.get(duplicateKey(item)) ?? 0) + 1);
  }
  let skippedDuplicates = 0;
  for (const row of rows) {
    const remaining = known.get(duplicateKey(row)) ?? 0;
    if (remaining > 0) {
      known.set(duplicateKey(row), remaining - 1);
      skippedDuplicates += 1;
      continue;
    }
    const id = `tx-imported-${data.transactions.length}`;
    data.transactions.push({ ...row, id, walletId, note: '', recurringRule: null, createdAt: 2000, updatedAt: 2000 });
  }
  return { imported: rows.length - skippedDuplicates, skippedDuplicates };
}

/** Fake answers for recurring generation, reports, CSV export and statement import. */
export function automationHandlers(data: FakeData): Handlers {
  return {
    'spending.generate_recurring': () => ({ created: 0 }),
    'spending.report': ({ from, to }) => report(data, from, to),
    'spending.export_csv': ({ from, to }) => csvOf(data, from, to),
    'spending.import_transactions': ({ walletId, rows }) => importRows(data, walletId, rows),
  };
}
