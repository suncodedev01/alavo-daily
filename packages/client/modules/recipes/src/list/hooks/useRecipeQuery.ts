import { useSearchParams } from 'react-router';

import type { RecipeQuery } from '../../recipe-filter';

export function useRecipeQuery(): [RecipeQuery, (patch: Partial<RecipeQuery>) => void, string] {
  const [params, setParams] = useSearchParams();
  const filter = { query: params.get('q') ?? '', tag: params.get('tag') ?? '' };
  const update = (patch: Partial<RecipeQuery>) => {
    const next = { ...filter, ...patch };
    const search = new URLSearchParams();
    if (next.query !== '') search.set('q', next.query);
    if (next.tag !== '') search.set('tag', next.tag);
    setParams(search, { replace: true });
  };
  return [filter, update, params.toString()];
}
