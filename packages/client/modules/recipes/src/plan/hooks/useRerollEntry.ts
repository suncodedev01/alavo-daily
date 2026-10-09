import { useEngineMutation, type SuggestedEntry } from '@alavo-daily/common/engine';
import { useState } from 'react';

import { useReportError } from '../../engine-errors';
import { entryKey, othersOf, replaceEntry } from '../logic/suggestion';

export interface RerollEntry {
  rerollingKey: string | null;
  reroll: (entry: SuggestedEntry) => void;
}

type SetEntries = (update: (current: SuggestedEntry[]) => SuggestedEntry[]) => void;

/**
 * Asks the engine for another dish for one meal with a new seed each time. The other proposed
 * meals are sent along as already planned, and the dish being replaced is avoided.
 */
export function useRerollEntry(entries: readonly SuggestedEntry[], setEntries: SetEntries): RerollEntry {
  const reportError = useReportError();
  const suggest = useEngineMutation('recipes.suggest_plan');
  const [seed, setSeed] = useState(0);
  const [rerollingKey, setRerollingKey] = useState<string | null>(null);

  const reroll = (entry: SuggestedEntry) => {
    const nextSeed = seed + 1;
    setSeed(nextSeed);
    setRerollingKey(entryKey(entry));
    const request = {
      from: entry.date,
      days: 1,
      slots: [entry.slot],
      seed: nextSeed,
      alsoPlanned: othersOf(entries, entry),
      avoid: [entry.recipeId],
    };
    suggest.mutate(request, {
      onSuccess: (found) => setEntries((current) => replaceEntry(current, entry, found[0])),
      onError: reportError,
      onSettled: () => setRerollingKey(null),
    });
  };
  return { rerollingKey, reroll };
}
