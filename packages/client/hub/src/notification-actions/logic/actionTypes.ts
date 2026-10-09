import { BUDGET_WARNING_ACTIONS, DISH_REMINDER_ACTIONS, type NotificationActionType } from '@alavo-daily/common';
import { formatVnd } from '@alavo-daily/common/format';

import { KEEP_BUDGET, RAISE_BUDGET, RAISE_BUDGET_VND, SNOOZE, START_COOKING } from './actionIds';

type Translate = (key: string, values?: Record<string, string | number>) => string;

export function buildActionTypes(t: Translate): NotificationActionType[] {
  return [
    {
      id: DISH_REMINDER_ACTIONS,
      actions: [
        { id: START_COOKING, label: t('Bắt đầu nấu') },
        { id: SNOOZE, label: t('Nhắc lại sau 10 phút') },
      ],
    },
    {
      id: BUDGET_WARNING_ACTIONS,
      actions: [
        { id: RAISE_BUDGET, label: t('Tăng thêm {{amount}}', { amount: formatVnd(RAISE_BUDGET_VND) }) },
        { id: KEEP_BUDGET, label: t('Giữ nguyên') },
      ],
    },
  ];
}
