import { BUDGET_WARNING_ACTIONS, type AppNotification, type NotifyOptions } from '@alavo-daily/common';

export function unannouncedBudgetNotices(
  notices: readonly AppNotification[],
  announced: ReadonlySet<string>,
): AppNotification[] {
  return notices.filter((notice) => !notice.read && notice.subjectId !== null && !announced.has(notice.id));
}

export function budgetNoticeOptions(notice: AppNotification): NotifyOptions {
  return { actionTypeId: BUDGET_WARNING_ACTIONS, data: { categoryId: notice.subjectId ?? '' } };
}
