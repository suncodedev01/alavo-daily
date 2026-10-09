import type { BudgetLine } from '@alavo-daily/common/engine';

export const RAISE_STEP_VND = 100_000;
export const RAISE_BUDGET_RATIO = 0.2;

export function pickDecisionLine(lines: readonly BudgetLine[]): BudgetLine | null {
  const flagged = lines.filter((line) => line.tone !== 'normal');
  if (flagged.length === 0) return null;
  return flagged.reduce((worst, line) => (line.pct > worst.pct ? line : worst));
}

export function suggestedRaiseVnd(line: BudgetLine): number {
  const overshoot = Math.max(0, line.spentVnd - line.budgetVnd);
  const wanted = Math.max(overshoot, line.budgetVnd * RAISE_BUDGET_RATIO);
  return Math.ceil(wanted / RAISE_STEP_VND) * RAISE_STEP_VND;
}

export function dismissalKey(line: BudgetLine, month: string): string {
  return `spending.keep-budget.${month}.${line.categoryId}.${line.budgetVnd}`;
}
