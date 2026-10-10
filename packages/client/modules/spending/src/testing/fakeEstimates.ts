import type {
  Estimate,
  EstimateItem,
  EstimatePriority,
  EstimateTotals,
  EstimateView,
  SavingOption,
  Transaction,
} from '@alavo-daily/common/engine';
import { EngineCallError } from '@alavo-daily/common/engine';
import type { Handlers } from '@alavo-daily/common/testing';

import type { FakeData } from './fixtures';

let counter = 0;

function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-new-${counter}`;
}

function invalid(message: string): EngineCallError {
  return new EngineCallError('validation', message);
}

function findEstimate(data: FakeData, id: string): Estimate {
  const found = data.estimates.find((item) => item.id === id);
  if (!found) throw new EngineCallError('not_found', `estimate ${id} was not found`);
  return found;
}

function replace(data: FakeData, next: Estimate): EstimateView {
  data.estimates = data.estimates.map((item) => (item.id === next.id ? next : item));
  return viewOf(data, next);
}

function amountOf(estimate: Estimate, item: EstimateItem): number {
  const by = item.by.reduce((product, id) => product * (estimate.factors.find((f) => f.id === id)?.value ?? 1), 1);
  return item.price * item.quantity * by;
}

function paidOf(estimate: Estimate, item: EstimateItem): number {
  return Math.max(0, Math.min(item.paid, amountOf(estimate, item)));
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

function totalsOf(data: FakeData, estimate: Estimate): EstimateTotals {
  const base = sum(estimate.items.map((item) => amountOf(estimate, item)));
  const paid = sum(estimate.items.map((item) => paidOf(estimate, item)));
  const contingency = Math.round((base * estimate.contingencyPercent) / 100);
  const remaining = base - paid + contingency;
  const available = sum(data.wallets.filter((w) => estimate.walletIds.includes(w.id)).map((w) => w.balanceVnd));
  const incoming = sum(estimate.income.map((line) => line.amount));
  const covered = remaining <= 0 ? 100 : Math.min(100, Math.floor((Math.max(0, available + incoming) * 100) / remaining));
  return {
    base, paid, contingency, total: base + contingency, remaining, available, incoming,
    result: available + incoming - remaining,
    withoutIncoming: available - remaining,
    coveredPercent: covered,
  };
}

function savingOptions(estimate: Estimate, totals: EstimateTotals): SavingOption[] {
  const options: EstimatePriority[][] = [['nice'], ['nice', 'should']];
  return options.map((dropped) => {
    const unpaid = sum(estimate.items.filter((item) => dropped.includes(item.priority)).map((item) => amountOf(estimate, item) - paidOf(estimate, item)));
    const saving = unpaid + Math.round((unpaid * estimate.contingencyPercent) / 100);
    return { dropped, saving, result: totals.result + saving };
  });
}

export function viewOf(data: FakeData, estimate: Estimate): EstimateView {
  const totals = totalsOf(data, estimate);
  return {
    estimate,
    totals,
    savingOptions: savingOptions(estimate, totals),
    amounts: estimate.items.map((item) => ({ id: item.id, amount: amountOf(estimate, item), paid: paidOf(estimate, item) })),
  };
}

function ledgerEntry(item: EstimateItem, estimate: Estimate, increase: number, record: { categoryId: string; walletId: string; occurredOn: string }): Transaction {
  return {
    id: nextId('tx'), occurredOn: record.occurredOn, title: item.name, categoryId: record.categoryId,
    walletId: record.walletId, amountVnd: -increase, note: estimate.name, recurringRule: null,
    createdAt: 1, updatedAt: 1,
  };
}

export function estimateHandlers(data: FakeData): Handlers {
  const saveRow = <K extends 'factors' | 'items' | 'income'>(estimateId: string, key: K, id: string | undefined, row: Estimate[K][number]) => {
    const estimate = findEstimate(data, estimateId);
    const rows = estimate[key] as { id: string }[];
    const next = id ? rows.map((entry) => (entry.id === id ? { ...entry, ...row } : entry)) : [...rows, { ...row, id: nextId(key) }];
    return replace(data, { ...estimate, [key]: next });
  };
  const dropRow = (estimateId: string, key: 'factors' | 'items' | 'income', id: string) => {
    const estimate = findEstimate(data, estimateId);
    const rows = (estimate[key] as { id: string }[]).filter((entry) => entry.id !== id);
    return replace(data, { ...estimate, [key]: rows } as Estimate);
  };
  return {
    'spending.list_estimates': () =>
      data.estimates.map((estimate) => {
        const totals = totalsOf(data, estimate);
        return { id: estimate.id, name: estimate.name, icon: estimate.icon, itemCount: estimate.items.length, total: totals.total, remaining: totals.remaining, result: totals.result, coveredPercent: totals.coveredPercent };
      }),
    'spending.get_estimate': ({ id }) => viewOf(data, findEstimate(data, id)),
    'spending.create_estimate': (input) => {
      if (!input.name.trim()) throw invalid('name must not be empty');
      const created: Estimate = {
        id: nextId('estimate'), name: input.name.trim(), icon: input.icon, contingencyPercent: input.contingencyPercent ?? 10,
        walletIds: input.walletIds ?? [], factors: (input.factors ?? []).map((f) => ({ id: nextId('factor'), ...f })), items: [], income: [],
      };
      data.estimates = [...data.estimates, created];
      return viewOf(data, created);
    },
    'spending.update_estimate': ({ id, ...changes }) => replace(data, { ...findEstimate(data, id), ...changes }),
    'spending.delete_estimate': ({ id }) => {
      findEstimate(data, id);
      data.estimates = data.estimates.filter((item) => item.id !== id);
      return {};
    },
    'spending.save_estimate_factor': ({ estimateId, id, label, value }) => saveRow(estimateId, 'factors', id, { id: id ?? '', label, value }),
    'spending.delete_estimate_factor': ({ estimateId, id }) => {
      const estimate = findEstimate(data, estimateId);
      const items = estimate.items.map((item) => ({ ...item, by: item.by.filter((by) => by !== id) }));
      replace(data, { ...estimate, items });
      return dropRow(estimateId, 'factors', id);
    },
    'spending.save_estimate_item': ({ estimateId, id, group, name, price, quantity, priority, by }) => {
      const estimate = findEstimate(data, estimateId);
      const paid = estimate.items.find((item) => item.id === id)?.paid ?? 0;
      const known = (by ?? []).filter((factor) => estimate.factors.some((f) => f.id === factor));
      return saveRow(estimateId, 'items', id, { id: id ?? '', group, name, price, quantity: quantity ?? 1, priority, by: known, paid });
    },
    'spending.delete_estimate_item': ({ estimateId, id }) => dropRow(estimateId, 'items', id),
    'spending.set_estimate_item_paid': ({ id, paid, record }) => {
      const estimate = data.estimates.find((entry) => entry.items.some((item) => item.id === id));
      const item = estimate?.items.find((entry) => entry.id === id);
      if (!estimate || !item) throw new EngineCallError('not_found', `estimate item ${id} was not found`);
      const next = Math.min(paid, amountOf(estimate, item));
      const increase = next - paidOf(estimate, item);
      if (record && increase > 0) data.transactions = [...data.transactions, ledgerEntry(item, estimate, increase, record)];
      return replace(data, { ...estimate, items: estimate.items.map((entry) => (entry.id === id ? { ...entry, paid: next } : entry)) });
    },
    'spending.save_estimate_income': ({ estimateId, id, label, amount }) => saveRow(estimateId, 'income', id, { id: id ?? '', label, amount }),
    'spending.delete_estimate_income': ({ estimateId, id }) => dropRow(estimateId, 'income', id),
  };
}
