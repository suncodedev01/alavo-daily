import type { StatementProblem } from '@alavo-daily/common/engine';

/** One statement line on the review step: what the engine read, plus whether to import it. */
export interface DraftRow {
  line: number;
  occurredOn: string | null;
  amountVnd: number | null;
  title: string;
  categoryId: string | null;
  problems: StatementProblem[];
  include: boolean;
}

export type ImportStep = 'input' | 'review';
