import { useEngineQuery } from '@alavo-daily/common/engine';

export interface RuleSetting {
  /** False until the rules have loaded. */
  ready: boolean;
  enabled: boolean;
  time: string | null;
}

export function useNotificationRule(ruleId: string): RuleSetting {
  const rules = useEngineQuery('hub.list_notification_rules');
  const rule = rules.data?.find((item) => item.id === ruleId);
  return { ready: rules.data !== undefined, enabled: rule?.enabled ?? false, time: rule?.time ?? null };
}
