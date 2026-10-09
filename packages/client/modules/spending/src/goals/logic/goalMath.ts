import { dayAndMonth, parseDateText } from '@alavo-daily/common/format';
import type { Goal } from '@alavo-daily/common/engine';

import type { DueLabel } from '../types';

const MS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const WEEKS_SHOWN_UNTIL_DAYS = 90;

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDateText(to).getTime() - parseDateText(from).getTime()) / MS_PER_DAY);
}

function monthAndYear(date: string): string {
  const [year, month] = date.split('-');
  return `${month}/${year}`;
}

export function dueLabelOf(goal: Pick<Goal, 'dueOn'>, today: string): DueLabel {
  if (goal.dueOn === null) return { kind: 'none' };
  const days = daysBetween(today, goal.dueOn);
  if (days < 0) return { kind: 'overdue', date: dayAndMonth(goal.dueOn) };
  if (days === 0) return { kind: 'today' };
  if (days < 2 * DAYS_PER_WEEK) return { kind: 'days', count: days, date: dayAndMonth(goal.dueOn) };
  if (days < WEEKS_SHOWN_UNTIL_DAYS) {
    return { kind: 'weeks', count: Math.round(days / DAYS_PER_WEEK), date: dayAndMonth(goal.dueOn) };
  }
  return { kind: 'months', count: Math.round(days / DAYS_PER_MONTH), date: monthAndYear(goal.dueOn) };
}

export function monthlyNeedVnd(goal: Goal, today: string): number | null {
  if (goal.dueOn === null) return null;
  const remaining = goal.targetVnd - goal.savedVnd;
  const days = daysBetween(today, goal.dueOn);
  if (remaining <= 0 || days <= 0) return null;
  return Math.ceil(remaining / Math.max(1, Math.ceil(days / DAYS_PER_MONTH)));
}

export function nearestDueGoal(goals: readonly Goal[], today: string): Goal | null {
  const open = goals.filter((goal) => monthlyNeedVnd(goal, today) !== null);
  const sorted = [...open].sort((a, b) => (a.dueOn ?? '').localeCompare(b.dueOn ?? ''));
  return sorted[0] ?? null;
}
