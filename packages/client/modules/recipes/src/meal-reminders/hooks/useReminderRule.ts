import { useEngineQuery } from '@alavo-daily/common/engine';

export interface ReminderRuleState {
  /** False until the rules have loaded: nothing should be scheduled or cleared before that. */
  ready: boolean;
  /** "HH:MM" when the rule is switched on and has a time, otherwise null. */
  time: string | null;
}

export function useReminderRule(ruleId: string): ReminderRuleState {
  const rules = useEngineQuery('hub.list_notification_rules');
  if (!rules.data) return { ready: false, time: null };
  const rule = rules.data.find((own) => own.id === ruleId);
  return { ready: true, time: rule?.enabled && rule.time ? rule.time : null };
}
