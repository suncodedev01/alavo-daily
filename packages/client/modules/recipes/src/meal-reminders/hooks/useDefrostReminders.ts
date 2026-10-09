import { useEngineQuery } from '@alavo-daily/common/engine';
import { useReminderSource, useT } from '@alavo-daily/common';
import { addDays } from '@alavo-daily/common/format';
import { useMemo } from 'react';

import { useToday } from '../../today';
import { buildDefrostReminders, DEFROST_RULE_ID, meatAndFishDishes } from '../logic/defrostReminders';
import { datesFrom, REMINDER_DAYS } from '../logic/reminderTimes';
import { usePlanAhead } from './usePlanAhead';
import { useReminderRule } from './useReminderRule';

const SOURCE = 'recipes.defrost_reminder';

/** The evening before a day with a meat or fish dish planned, reminds the person to take it out of the freezer. */
export function useDefrostReminders(): void {
  const t = useT();
  const today = useToday();
  const tomorrow = addDays(today, 1);
  const rule = useReminderRule(DEFROST_RULE_ID);
  const plan = usePlanAhead(today);
  const list = useEngineQuery('recipes.get_shopping_list', {
    from: tomorrow,
    to: addDays(today, REMINDER_DAYS),
  });

  const reminders = useMemo(() => {
    if (!rule.ready || !plan.data || !list.data) return null;
    if (rule.time === null) return [];
    return buildDefrostReminders({
      entries: plan.data,
      meatDishes: meatAndFishDishes(list.data),
      cookDates: datesFrom(tomorrow),
      time: rule.time,
      now: Date.now(),
      t,
    });
  }, [rule.ready, rule.time, plan.data, list.data, tomorrow, t]);

  useReminderSource(SOURCE, reminders);
}
