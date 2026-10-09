import type { BudgetLine } from '@alavo-daily/common/engine';
import { describe, expect, it } from 'vitest';

import { dismissalKey, pickDecisionLine, suggestedRaiseVnd } from './decision';
import { deltaRatio } from './delta';

function line(categoryId: string, spentVnd: number, budgetVnd: number): BudgetLine {
  const pct = spentVnd / budgetVnd;
  return {
    categoryId,
    name: categoryId,
    icon: 'tag',
    budgetVnd,
    spentVnd,
    pct,
    remainingVnd: budgetVnd - spentVnd,
    tone: pct > 1 ? 'over' : pct >= 0.85 ? 'warn' : 'normal',
  };
}

describe('pickDecisionLine', () => {
  it('returns nothing when every line is under 85%', () => {
    expect(pickDecisionLine([line('a', 84, 100), line('b', 10, 100)])).toBeNull();
  });

  it('flags a line at exactly 85%', () => {
    expect(pickDecisionLine([line('a', 85, 100)])?.categoryId).toBe('a');
  });

  it('picks the line with the biggest percentage, not a fixed category', () => {
    const picked = pickDecisionLine([line('food', 90, 100), line('fun', 120, 100), line('bills', 86, 100)]);
    expect(picked?.categoryId).toBe('fun');
  });

  it('returns nothing for no lines', () => {
    expect(pickDecisionLine([])).toBeNull();
  });
});

describe('suggestedRaiseVnd', () => {
  it('suggests a fifth of the budget rounded up to 100.000', () => {
    expect(suggestedRaiseVnd(line('food', 2_397_000, 2_600_000))).toBe(600_000);
  });

  it('covers the overshoot when it is bigger than a fifth', () => {
    expect(suggestedRaiseVnd(line('fun', 900_000, 400_000))).toBe(500_000);
  });
});

describe('dismissalKey', () => {
  it('changes when the budget changes so a raised budget asks again', () => {
    const before = dismissalKey(line('food', 90, 100), '2026-10');
    const after = dismissalKey(line('food', 90, 150), '2026-10');
    expect(before).not.toBe(after);
  });
});

describe('deltaRatio', () => {
  it('is null without a previous value', () => {
    expect(deltaRatio(100, 0)).toBeNull();
  });

  it('is the relative change otherwise', () => {
    expect(deltaRatio(75, 100)).toBe(-0.25);
    expect(deltaRatio(150, 100)).toBe(0.5);
  });
});
