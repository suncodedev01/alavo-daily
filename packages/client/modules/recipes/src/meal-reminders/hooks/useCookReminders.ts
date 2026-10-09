import { useEngineQuery } from '@alavo-daily/common/engine';
import { useReminderSource, useT } from '@alavo-daily/common';
import { useMemo } from 'react';

import { useToday } from '../../today';
import { buildCookReminders, COOK_RULE_ID } from '../logic/cookReminders';
import { datesFrom } from '../logic/reminderTimes';
import { usePlanAhead } from './usePlanAhead';
import { useReminderRule } from './useReminderRule';

const SOURCE = 'recipes.cook_reminder';

/** Tells the person when to start cooking each planned dinner of the next seven days. */
export function useCookReminders(): void {
  const t = useT();
  const today = useToday();
  const rule = useReminderRule(COOK_RULE_ID);
  const plan = usePlanAhead(today);
  const recipes = useEngineQuery('recipes.list');

  const reminders = useMemo(() => {
    if (!rule.ready || !plan.data || !recipes.data) return null;
    if (rule.time === null) return [];
    return buildCookReminders({
      entries: plan.data,
      recipes: recipes.data,
      dinnerTime: rule.time,
      dates: datesFrom(today),
      now: Date.now(),
      t,
    });
  }, [rule.ready, rule.time, plan.data, recipes.data, today, t]);

  useReminderSource(SOURCE, reminders);
}
