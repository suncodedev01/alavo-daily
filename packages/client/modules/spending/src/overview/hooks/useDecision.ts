import { useEngineMutation, useEngineQuery } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { useState } from 'react';

import { describeEngineError } from '../../engine-errors';
import { dismissalKey, pickDecisionLine, suggestedRaiseVnd } from '../logic/decision';
import type { MonthScope, Decision } from '../types';
import { useDismissal } from './useDismissal';

export function useDecision({ month, today, isCurrentMonth }: MonthScope): Decision | null {
  const t = useT();
  const status = useEngineQuery('spending.budget_status', { month, today });
  const update = useEngineMutation('spending.update_category');
  const [error, setError] = useState<string | null>(null);
  const line = isCurrentMonth ? pickDecisionLine(status.data?.lines ?? []) : null;
  const { dismissed, dismiss } = useDismissal(line ? dismissalKey(line, month) : '');
  if (!line || dismissed) return null;
  const raiseVnd = suggestedRaiseVnd(line);
  return {
    line,
    daysLeft: status.data?.daysLeft ?? 0,
    raiseVnd,
    pending: update.isPending,
    error,
    keep: dismiss,
    raise: () =>
      update.mutate(
        { id: line.categoryId, budgetVnd: line.budgetVnd + raiseVnd },
        { onError: (failure) => setError(describeEngineError(failure, t)) },
      ),
  };
}
