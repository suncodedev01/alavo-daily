import type { StatementProblem } from '@alavo-daily/common/engine';

const PROBLEM_TEXT: Record<StatementProblem, string> = {
  missing_date: 'Thiếu ngày',
  invalid_date: 'Không đọc được ngày',
  missing_amount: 'Thiếu số tiền',
  invalid_amount: 'Không đọc được số tiền',
  zero_amount: 'Số tiền bằng 0',
};

/** The Vietnamese text key for a problem; pass it through `t()`. */
export function problemText(problem: StatementProblem): string {
  return PROBLEM_TEXT[problem];
}
