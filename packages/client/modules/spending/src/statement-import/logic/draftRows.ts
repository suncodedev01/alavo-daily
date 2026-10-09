import type { CategoryKind, StatementImportRow, StatementPreview } from '@alavo-daily/common/engine';

import type { DraftRow } from '../types';

/** A line can be imported when the engine read a date, a non-zero amount and a category for it. */
export function isImportable(row: DraftRow): boolean {
  const hasAmount = row.amountVnd !== null && row.amountVnd !== 0;
  return row.problems.length === 0 && row.occurredOn !== null && hasAmount && row.categoryId !== null;
}

export function toDraftRows(preview: StatementPreview): DraftRow[] {
  return preview.rows.map((row) => {
    const draft = { ...row, include: false };
    return { ...draft, include: isImportable(draft) };
  });
}

export function patchRow(rows: readonly DraftRow[], line: number, changes: Partial<DraftRow>): DraftRow[] {
  return rows.map((row) => (row.line === line ? { ...row, ...changes } : row));
}

export function setAllIncluded(rows: readonly DraftRow[], include: boolean): DraftRow[] {
  return rows.map((row) => (isImportable(row) ? { ...row, include } : row));
}

export function selectedRows(rows: readonly DraftRow[]): StatementImportRow[] {
  return rows.flatMap((row) => {
    if (!row.include || !isImportable(row)) return [];
    return [{ occurredOn: row.occurredOn!, amountVnd: row.amountVnd!, title: row.title, categoryId: row.categoryId! }];
  });
}

export function kindOfAmount(amountVnd: number): CategoryKind {
  return amountVnd < 0 ? 'expense' : 'income';
}

export interface SelectionSummary {
  importable: number;
  selected: number;
  skipped: number;
}

export function summarize(rows: readonly DraftRow[]): SelectionSummary {
  const importable = rows.filter(isImportable).length;
  const selected = rows.filter((row) => row.include && isImportable(row)).length;
  return { importable, selected, skipped: rows.length - importable };
}
