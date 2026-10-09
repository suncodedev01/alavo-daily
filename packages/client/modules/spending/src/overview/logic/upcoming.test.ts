import type { Bill } from '@alavo-daily/common/engine';
import { describe, expect, it } from 'vitest';

import { nextDueDate, upcomingBills } from './upcoming';

function bill(id: string, dayOfMonth: number, active = true): Bill {
  return { id, title: id, icon: 'wallet', amountVnd: 1000, dayOfMonth, active };
}

describe('nextDueDate', () => {
  it('stays in this month while the day has not passed', () => {
    expect(nextDueDate(12, '2026-10-09')).toBe('2026-10-12');
  });

  it('counts today as due', () => {
    expect(nextDueDate(9, '2026-10-09')).toBe('2026-10-09');
  });

  it('rolls over to next month once the day has passed', () => {
    expect(nextDueDate(5, '2026-10-09')).toBe('2026-11-05');
  });

  it('rolls over the year', () => {
    expect(nextDueDate(5, '2026-12-20')).toBe('2027-01-05');
  });

  it('clamps day 31 to the end of a shorter month', () => {
    expect(nextDueDate(31, '2026-02-10')).toBe('2026-02-28');
    expect(nextDueDate(31, '2026-04-10')).toBe('2026-04-30');
  });
});

describe('upcomingBills', () => {
  it('sorts by next due date, skips paused bills and applies the limit', () => {
    const bills = [bill('late', 28), bill('paused', 10, false), bill('soon', 10), bill('passed', 2), bill('mid', 15)];
    const result = upcomingBills(bills, '2026-10-09', 3);
    expect(result.map((entry) => entry.bill.id)).toEqual(['soon', 'mid', 'late']);
    expect(result[0]?.dueOn).toBe('2026-10-10');
  });

  it('puts bills that already passed this month after the ones still coming', () => {
    const result = upcomingBills([bill('passed', 2), bill('coming', 20)], '2026-10-09', 5);
    expect(result.map((entry) => entry.bill.id)).toEqual(['coming', 'passed']);
  });
});
