import type { Goal } from '@alavo-daily/common/engine';
import { describe, expect, it } from 'vitest';

import { dueLabelOf, monthlyNeedVnd, nearestDueGoal } from './goalMath';

const TODAY = '2026-10-09';

function goal(dueOn: string | null, savedVnd = 0, targetVnd = 12_000_000): Goal {
  return { id: `g-${dueOn}`, name: 'Goal', icon: 'target', targetVnd, savedVnd, dueOn };
}

describe('dueLabelOf', () => {
  it('has no deadline label without a due date', () => {
    expect(dueLabelOf(goal(null), TODAY)).toEqual({ kind: 'none' });
  });

  it('flags overdue and same-day goals', () => {
    expect(dueLabelOf(goal('2026-10-01'), TODAY)).toEqual({ kind: 'overdue', date: '1/10' });
    expect(dueLabelOf(goal(TODAY), TODAY)).toEqual({ kind: 'today' });
  });

  it('counts days within two weeks', () => {
    expect(dueLabelOf(goal('2026-10-15'), TODAY)).toEqual({ kind: 'days', count: 6, date: '15/10' });
  });

  it('counts weeks up to about three months', () => {
    expect(dueLabelOf(goal('2026-12-20'), TODAY)).toEqual({ kind: 'weeks', count: 10, date: '20/12' });
  });

  it('counts months beyond that', () => {
    expect(dueLabelOf(goal('2027-04-09'), TODAY)).toEqual({ kind: 'months', count: 6, date: '04/2027' });
  });
});

describe('monthlyNeedVnd', () => {
  it('splits what is left over the started 30-day periods', () => {
    expect(monthlyNeedVnd(goal('2026-12-09', 6_000_000), TODAY)).toBe(2_000_000);
  });

  it('is null without a due date, when reached or when overdue', () => {
    expect(monthlyNeedVnd(goal(null), TODAY)).toBeNull();
    expect(monthlyNeedVnd(goal('2026-12-09', 12_000_000), TODAY)).toBeNull();
    expect(monthlyNeedVnd(goal('2026-10-01'), TODAY)).toBeNull();
  });

  it('asks for everything when due within the month', () => {
    expect(monthlyNeedVnd(goal('2026-10-20', 2_000_000), TODAY)).toBe(10_000_000);
  });
});

describe('nearestDueGoal', () => {
  it('picks the goal that is due first among open ones', () => {
    const goals = [goal('2027-04-09'), goal(null), goal('2026-12-09'), goal('2026-10-01')];
    expect(nearestDueGoal(goals, TODAY)?.dueOn).toBe('2026-12-09');
  });

  it('returns null when nothing qualifies', () => {
    expect(nearestDueGoal([goal(null)], TODAY)).toBeNull();
  });
});
