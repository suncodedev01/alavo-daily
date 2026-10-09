import { useEngineMutation, type SuggestedEntry } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { useToast } from '@alavo-daily/design-system';
import { useState } from 'react';

import { useReportError } from '../../engine-errors';

export interface ApplySuggestion {
  applying: boolean;
  apply: (entries: readonly SuggestedEntry[]) => void;
}

/** Saves the proposed meals into the plan one by one through `recipes.add_to_plan`. */
export function useApplySuggestion(servings: number, onApplied: () => void): ApplySuggestion {
  const t = useT();
  const { toast } = useToast();
  const reportError = useReportError();
  const addToPlan = useEngineMutation('recipes.add_to_plan');
  const [applying, setApplying] = useState(false);

  const addAll = async (entries: readonly SuggestedEntry[]) => {
    for (const { date, slot, recipeId } of entries) {
      await addToPlan.mutateAsync({ date, slot, recipeId, servings });
    }
  };

  const apply = (entries: readonly SuggestedEntry[]) => {
    setApplying(true);
    addAll(entries)
      .then(() => {
        toast(t('Đã thêm {{count}} món vào thực đơn', { count: entries.length }));
        onApplied();
      })
      .catch(reportError)
      .finally(() => setApplying(false));
  };
  return { applying, apply };
}
