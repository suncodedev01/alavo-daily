import type { SuggestedEntry } from '@alavo-daily/common/engine';
import { useState } from 'react';

import { removeEntry } from '../logic/suggestion';
import { useApplySuggestion } from './useApplySuggestion';
import { useRerollEntry } from './useRerollEntry';

export interface SuggestionEditor {
  entries: SuggestedEntry[];
  rerollingKey: string | null;
  applying: boolean;
  reroll: (entry: SuggestedEntry) => void;
  remove: (entry: SuggestedEntry) => void;
  apply: () => void;
}

export interface SuggestionEditorOptions {
  servings: number;
  onApplied: () => void;
}

/** The proposal the person is looking at: they can change a dish, drop a meal, or apply it all. */
export function useSuggestionEditor(
  initial: readonly SuggestedEntry[],
  { servings, onApplied }: SuggestionEditorOptions,
): SuggestionEditor {
  const [entries, setEntries] = useState<SuggestedEntry[]>([...initial]);
  const { rerollingKey, reroll } = useRerollEntry(entries, setEntries);
  const { applying, apply } = useApplySuggestion(servings, onApplied);
  const remove = (entry: SuggestedEntry) => setEntries((current) => removeEntry(current, entry));
  return { entries, rerollingKey, applying, reroll, remove, apply: () => apply(entries) };
}
