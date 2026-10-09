import { describe, expect, it } from 'vitest';

import { transaction } from '../../testing/fixtures';
import { filterTransactions, foldText, groupByDay } from './transactionList';

const NAMES: Record<string, string> = { 'category-food': 'Ăn uống', 'category-income': 'Thu nhập' };
const nameOf = (id: string) => NAMES[id] ?? '';

const pho = transaction('2026-10-06', 'Phở Thìn', 'food', 'cash', -70_000);
const coffee = transaction('2026-10-09', 'Highlands Coffee', 'food', 'momo', -65_000);
const salary = transaction('2026-10-06', 'Lương tháng 10', 'income', 'tcb', 28_000_000);
const rent = transaction('2026-10-05', 'Tiền nhà', 'food', 'tcb', -7_500_000, 'monthly:5');

describe('groupByDay', () => {
  it('groups rows of the same day and puts the newest day first', () => {
    const groups = groupByDay([pho, salary, rent, coffee]);
    expect(groups.map((group) => group.date)).toEqual(['2026-10-09', '2026-10-06', '2026-10-05']);
    expect(groups[1]?.items).toEqual([pho, salary]);
  });

  it('returns no groups for an empty list', () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe('foldText', () => {
  it('removes Vietnamese diacritics and the letter đ', () => {
    expect(foldText('Phở Đà Lạt')).toBe('pho da lat');
  });
});

describe('filterTransactions', () => {
  const all = [coffee, pho, salary, rent];

  it('keeps everything for the all filter with no query', () => {
    expect(filterTransactions(all, { filter: 'all', query: '' }, nameOf)).toHaveLength(4);
  });

  it('keeps only spending for the expense filter and only income for the income filter', () => {
    expect(filterTransactions(all, { filter: 'expense', query: '' }, nameOf)).toEqual([coffee, pho, rent]);
    expect(filterTransactions(all, { filter: 'income', query: '' }, nameOf)).toEqual([salary]);
  });

  it('keeps only repeating payments for the recurring filter', () => {
    expect(filterTransactions(all, { filter: 'recurring', query: '' }, nameOf)).toEqual([rent]);
  });

  it('matches the title ignoring case and diacritics', () => {
    expect(filterTransactions(all, { filter: 'all', query: 'PHO' }, nameOf)).toEqual([pho]);
  });

  it('matches the category name too', () => {
    expect(filterTransactions(all, { filter: 'all', query: 'thu nhap' }, nameOf)).toEqual([salary]);
  });

  it('combines the filter with the query', () => {
    expect(filterTransactions(all, { filter: 'income', query: 'coffee' }, nameOf)).toEqual([]);
  });
});
