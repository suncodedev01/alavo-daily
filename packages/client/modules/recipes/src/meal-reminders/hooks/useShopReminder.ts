import { useEngineQuery } from '@alavo-daily/common/engine';
import { useReminderSource, useT } from '@alavo-daily/common';
import { useMemo } from 'react';

import { useToday } from '../../today';
import { nextSaturday } from '../logic/reminderTimes';
import { buildShopReminder, shoppingRangeFrom, SHOP_RULE_ID } from '../logic/shopReminders';
import { useReminderRule } from './useReminderRule';

const SOURCE = 'recipes.shop_reminder';

/** On the next Saturday, reminds the person to shop while the list for the coming week is not all bought. */
export function useShopReminder(): void {
  const t = useT();
  const today = useToday();
  const saturday = nextSaturday(today);
  const rule = useReminderRule(SHOP_RULE_ID);
  const list = useEngineQuery('recipes.get_shopping_list', shoppingRangeFrom(saturday));

  const reminders = useMemo(() => {
    if (!rule.ready || !list.data) return null;
    if (rule.time === null) return [];
    return buildShopReminder({ list: list.data, saturday, time: rule.time, now: Date.now(), t });
  }, [rule.ready, rule.time, list.data, saturday, t]);

  useReminderSource(SOURCE, reminders);
}
