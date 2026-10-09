import { notificationId, type ScheduledNotification } from '@alavo-daily/common';
import type { Bill } from '@alavo-daily/common/engine';
import { addDays } from '@alavo-daily/common/format';

import { nextDueDate } from '../../overview';
import { atLocalTime } from './localTime';

export const BILL_REMINDER_RULE_ID = 'spending.bill_reminder';
export const BILL_LEAD_DAYS = 2;
export const BILL_HORIZON_DAYS = 14;

export interface ReminderText {
  title: string;
  body: string;
}

export interface BillReminderInput {
  bills: readonly Bill[];
  /** `HH:MM` from the notification rule. */
  time: string;
  today: string;
  now: number;
  describe: (bill: Bill, dueOn: string) => ReminderText;
}

export function billsDueOn(bills: readonly Bill[], dueOn: string): Bill[] {
  return bills.filter((bill) => bill.active && nextDueDate(bill.dayOfMonth, dueOn) === dueOn);
}

export function billReminderId(bill: Bill, dueOn: string): number {
  return notificationId(`spending:bill:${bill.id}:${dueOn}`);
}

/**
 * One reminder per bill, two days before it falls due, at the rule time, for every reminder day
 * from today over the next 14 days. A reminder whose time already passed is left out.
 */
export function buildBillReminders({ bills, time, today, now, describe }: BillReminderInput): ScheduledNotification[] {
  const days = Array.from({ length: BILL_HORIZON_DAYS }, (_, offset) => addDays(today, offset));
  return days.flatMap((remindOn) => {
    const at = atLocalTime(remindOn, time);
    if (at === null || at <= now) return [];
    const dueOn = addDays(remindOn, BILL_LEAD_DAYS);
    return billsDueOn(bills, dueOn).map((bill) => ({ id: billReminderId(bill, dueOn), at, ...describe(bill, dueOn) }));
  });
}
