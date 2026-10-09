import { useEngineQuery, usePlatform, useT } from '@alavo-daily/common';
import { useEffect } from 'react';

import { useToday } from '../../today';
import { describeMenu } from '../logic/describeMenu';
import { buildReminders, MORNING_MENU_RULE_ID, MORNINGS_AHEAD } from '../logic/reminders';

/**
 * Keeps the platform's scheduled notifications equal to the next few mornings' menus. Every
 * change to the plan or the recipes refetches the menus, which replaces the schedule.
 */
export function useMorningReminders(): void {
  const t = useT();
  const platform = usePlatform();
  const today = useToday();
  const menus = useEngineQuery('recipes.morning_menus', { from: today, days: MORNINGS_AHEAD });
  const rules = useEngineQuery('hub.list_notification_rules');
  const rule = rules.data?.find((item) => item.id === MORNING_MENU_RULE_ID);

  useEffect(() => {
    if (!menus.data || !rules.data) return;
    const reminders =
      rule?.enabled && rule.time
        ? buildReminders({
            menus: menus.data,
            startTime: rule.time,
            now: Date.now(),
            describe: (menu) => describeMenu(menu, t),
          })
        : [];
    void platform.scheduleNotifications(reminders);
  }, [menus.data, rules.data, rule?.enabled, rule?.time, platform, t]);
}
