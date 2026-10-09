import type { Draft } from '../types';

export interface DraftCost {
  totalVnd: number;
  perServingVnd: number;
}

/** What the recipe costs as typed so far. Rows without a name are not saved, so they do not count. */
export function draftCost(draft: Draft): DraftCost {
  const named = draft.ingredients.filter((item) => item.name.trim() !== '');
  const totalVnd = named.reduce((sum, item) => sum + item.costVnd, 0);
  const perServingVnd = draft.servings > 0 ? Math.round(totalVnd / draft.servings) : 0;
  return { totalVnd, perServingVnd };
}
