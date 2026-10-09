import { useEngineQuery } from '@alavo-daily/common/engine';

import { REMINDER_DAYS } from '../logic/reminderTimes';

/** The plan from today for a week and a day: the cook reminders need the week, the defrost ones the day after. */
export function usePlanAhead(today: string) {
  return useEngineQuery('recipes.get_plan', { from: today, days: REMINDER_DAYS + 1 });
}
