import type { Transaction } from '@alavo-daily/common/engine';

import { monthlyRuleDay } from '../../transaction-model';

export type Recurrence =
  | { kind: 'none' }
  | { kind: 'template'; day: number }
  | { kind: 'generated'; templateId: string };

export function recurrenceOf(transaction: Transaction): Recurrence {
  if (transaction.recurringSourceId) {
    return { kind: 'generated', templateId: transaction.recurringSourceId };
  }
  const day = monthlyRuleDay(transaction.recurringRule);
  return day === null ? { kind: 'none' } : { kind: 'template', day };
}

export function isGenerated(transaction: Transaction): boolean {
  return Boolean(transaction.recurringSourceId);
}
