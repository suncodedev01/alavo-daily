import { useEngineQuery } from '@alavo-daily/common/engine';
import { useParams, useSearchParams } from 'react-router';

import { QueryState } from '../../query-state';
import { useHouseholdSize } from '../../household';
import { CookingSession } from './CookingSession';
import { parseServings } from '../logic/parseServings';

export function CookingScreen() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const fallback = useHouseholdSize();
  const recipe = useEngineQuery('recipes.get', { id });
  const servings = parseServings(params.get('servings'), fallback);
  return (
    <QueryState query={recipe}>
      {(loaded) => <CookingSession key={loaded.id} recipe={loaded} servings={servings} />}
    </QueryState>
  );
}
