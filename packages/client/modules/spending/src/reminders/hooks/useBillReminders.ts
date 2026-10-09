import { useReminderSource, useT } from '@alavo-daily/common';
import { useEngineQuery } from '@alavo-daily/common/engine';
import { dayAndMonth, formatVnd } from '@alavo-daily/common/format';
import { useMemo } from 'react';

import { useToday } from '../../today';
import { BILL_REMINDER_RULE_ID, buildBillReminders } from '../logic/billReminders';
import { useNotificationRule } from './useNotificationRule';

const SOURCE = BILL_REMINDER_RULE_ID;

/**
 * Tells the app which bill reminders to schedule. Every change to the bills refetches them, which
 * replaces this module's reminders; a rule that is off or has no time clears them.
 */
export function useBillReminders(): void {
  const t = useT();
  const today = useToday();
  const bills = useEngineQuery('spending.list_bills');
  const rule = useNotificationRule(BILL_REMINDER_RULE_ID);

  const reminders = useMemo(() => {
    if (!bills.data || !rule.ready) return null;
    if (!rule.enabled || !rule.time) return [];
    return buildBillReminders({
      bills: bills.data,
      time: rule.time,
      today,
      now: Date.now(),
      describe: (bill, dueOn) => ({
        title: t('Hoá đơn sắp đến hạn'),
        body: t('{{title}} sắp đến hạn: {{amount}} vào {{date}}', {
          title: bill.title,
          amount: formatVnd(bill.amountVnd),
          date: dayAndMonth(dueOn),
        }),
      }),
    });
  }, [bills.data, rule.ready, rule.enabled, rule.time, today, t]);

  useReminderSource(SOURCE, reminders);
}
