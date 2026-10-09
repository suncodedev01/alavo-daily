import { useEngineQuery, useReminderSource, useT } from '@alavo-daily/common';
import { useMemo } from 'react';

import { useToday } from '../../today';
import { describeMenu } from '../logic/describeMenu';
import { buildReminders, MORNING_MENU_RULE_ID, MORNINGS_AHEAD } from '../logic/reminders';

const SOURCE = 'recipes.morning_menu';

/**
 * Tells the app which morning reminders to schedule for the next few mornings. Every change to
 * the plan or the recipes refetches the menus, which replaces this module's reminders.
 */
export function useMorningReminders(): void {
  const t = useT();
  const today = useToday();
  const menus = useEngineQuery('recipes.morning_menus', { from: today, days: MORNINGS_AHEAD });
  const rules = useEngineQuery('hub.list_notification_rules');
  const rule = rules.data?.find((item) => item.id === MORNING_MENU_RULE_ID);

  const reminders = useMemo(() => {
    if (!menus.data || !rules.data) return null;
    if (!rule?.enabled || !rule.time) return [];
    return buildReminders({
      menus: menus.data,
      startTime: rule.time,
      now: Date.now(),
      describe: (menu) => describeMenu(menu, t),
    });
  }, [menus.data, rules.data, rule?.enabled, rule?.time, t]);

  useReminderSource(SOURCE, reminders);
}
