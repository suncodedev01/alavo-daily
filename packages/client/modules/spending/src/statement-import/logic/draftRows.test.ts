import type { StatementPreview, StatementPreviewRow } from '@alavo-daily/common/engine';
import { describe, expect, it } from 'vitest';

import { kindOfAmount, patchRow, selectedRows, setAllIncluded, summarize, toDraftRows } from './draftRows';

function previewRow(line: number, overrides: Partial<StatementPreviewRow> = {}): StatementPreviewRow {
  return {
    line,
    occurredOn: '2026-10-09',
    amountVnd: -65_000,
    title: 'GRAB*TRIP',
    categoryId: 'category-transport',
    problems: [],
    ...overrides,
  };
}

const bad = previewRow(3, { occurredOn: null, problems: ['invalid_date'] });
const preview: StatementPreview = { delimiter: ';', rows: [previewRow(1), previewRow(2, { amountVnd: 500_000, categoryId: 'category-income' }), bad] };

describe('toDraftRows', () => {
  it('includes the lines that can be imported and leaves out the ones with problems', () => {
    expect(toDraftRows(preview).map((row) => row.include)).toEqual([true, true, false]);
  });

  it('does not include a zero amount or a line without a category', () => {
    const rows = toDraftRows({ delimiter: ',', rows: [previewRow(1, { amountVnd: 0 }), previewRow(2, { categoryId: null })] });
    expect(rows.map((row) => row.include)).toEqual([false, false]);
  });
});

describe('editing the draft', () => {
  const rows = toDraftRows(preview);

  it('changes only the line asked for', () => {
    const next = patchRow(rows, 1, { categoryId: 'category-food' });
    expect(next[0]?.categoryId).toBe('category-food');
    expect(next[1]).toBe(rows[1]);
  });

  it('selects or clears every importable line and never a broken one', () => {
    expect(setAllIncluded(rows, false).map((row) => row.include)).toEqual([false, false, false]);
    expect(setAllIncluded(setAllIncluded(rows, false), true).map((row) => row.include)).toEqual([true, true, false]);
  });
});

describe('selectedRows', () => {
  it('sends only the included, importable lines in the shape the engine takes', () => {
    const rows = patchRow(toDraftRows(preview), 2, { include: false });
    expect(selectedRows(rows)).toEqual([
      { occurredOn: '2026-10-09', amountVnd: -65_000, title: 'GRAB*TRIP', categoryId: 'category-transport' },
    ]);
  });

  it('ignores a broken line even if it was marked as included', () => {
    const rows = patchRow(toDraftRows(preview), 3, { include: true });
    expect(selectedRows(rows)).toHaveLength(2);
  });
});

describe('summarize', () => {
  it('counts the importable, selected and unreadable lines', () => {
    const rows = patchRow(toDraftRows(preview), 1, { include: false });
    expect(summarize(rows)).toEqual({ importable: 2, selected: 1, skipped: 1 });
  });
});

describe('kindOfAmount', () => {
  it('reads money out as an expense and money in as income', () => {
    expect(kindOfAmount(-1)).toBe('expense');
    expect(kindOfAmount(1)).toBe('income');
  });
});
