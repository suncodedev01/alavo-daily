import { useReminderSource, useT } from '@alavo-daily/common';
import { useEngineQuery, type SpendingReport } from '@alavo-daily/common/engine';
import { formatVnd } from '@alavo-daily/common/format';
import { useMemo } from 'react';

import { useToday } from '../../today';
import {
  buildWeeklyReminders,
  SUNDAYS_AHEAD,
  topExpenseCategory,
  upcomingSundays,
  weekEndingOn,
  WEEKLY_SUMMARY_RULE_ID,
} from '../logic/weeklySummary';
import { useNotificationRule } from './useNotificationRule';

const SOURCE = WEEKLY_SUMMARY_RULE_ID;

/**
 * Tells the app which weekly spending summaries to schedule: one for each of the next two Sundays,
 * worded from the spending recorded so far in that week.
 */
export function useWeeklySummaryReminder(): void {
  const t = useT();
  const today = useToday();
  const rule = useNotificationRule(WEEKLY_SUMMARY_RULE_ID);
  const sundays = useMemo(
    () => upcomingSundays(today, rule.time ?? '', Date.now(), SUNDAYS_AHEAD),
    [today, rule.time],
  );
  const first = useEngineQuery('spending.report', weekEndingOn(sundays[0] ?? today));
  const second = useEngineQuery('spending.report', weekEndingOn(sundays[1] ?? today));

  const reminders = useMemo(() => {
    if (!first.data || !second.data || !rule.ready) return null;
    if (!rule.enabled || !rule.time) return [];
    return buildWeeklyReminders({
      sundays,
      reports: [first.data, second.data],
      time: rule.time,
      now: Date.now(),
      describe: (report) => describeWeek(report, t),
    });
  }, [first.data, second.data, rule.ready, rule.enabled, rule.time, sundays, t]);

  useReminderSource(SOURCE, reminders);
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

function describeWeek(report: SpendingReport, t: Translate): { title: string; body: string } {
  const title = t('Tóm tắt chi tiêu tuần này');
  const top = topExpenseCategory(report);
  if (!top) return { title, body: t('Tuần này bạn chưa ghi khoản chi nào.') };
  const body = t('Tuần này bạn chi {{total}}, nhiều nhất là {{category}} ({{amount}}).', {
    total: formatVnd(report.expenseVnd),
    category: t(top.name),
    amount: formatVnd(top.totalVnd),
  });
  return { title, body };
}
