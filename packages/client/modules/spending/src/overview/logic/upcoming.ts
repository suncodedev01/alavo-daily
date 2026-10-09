import type { Bill } from '@alavo-daily/common/engine';
import { addMonths, daysInMonth } from '@alavo-daily/common/format';

import type { UpcomingBill } from '../types';

function dueIn(month: string, dayOfMonth: number): string {
  const day = Math.min(dayOfMonth, daysInMonth(month));
  return `${month}-${String(day).padStart(2, '0')}`;
}

export function nextDueDate(dayOfMonth: number, today: string): string {
  const thisMonth = dueIn(today.slice(0, 7), dayOfMonth);
  if (thisMonth >= today) return thisMonth;
  return dueIn(addMonths(today.slice(0, 7), 1), dayOfMonth);
}

export function upcomingBills(bills: readonly Bill[], today: string, limit: number): UpcomingBill[] {
  return bills
    .filter((bill) => bill.active)
    .map((bill) => ({ bill, dueOn: nextDueDate(bill.dayOfMonth, today) }))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.bill.title.localeCompare(b.bill.title))
    .slice(0, limit);
}
