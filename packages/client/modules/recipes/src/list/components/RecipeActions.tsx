import type { Recipe } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button } from '@alavo-daily/design-system';
import { useNavigate } from 'react-router';

import { useAddIngredientsToShopping } from '../hooks/useAddIngredientsToShopping';
import { AddToPlanMenu } from './AddToPlanMenu';

export function RecipeActions({ recipe, servings }: { recipe: Recipe; servings: number }) {
  const t = useT();
  const navigate = useNavigate();
  const addToShopping = useAddIngredientsToShopping(recipe, servings);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        leadingIcon="play"
        onClick={() => navigate(`/recipes/cook/${recipe.id}?servings=${servings}`)}
      >
        {t('Bắt đầu nấu')}
      </Button>
      <AddToPlanMenu recipeId={recipe.id} recipeName={recipe.name} servings={servings} />
      <Button
        variant="ghost"
        leadingIcon="shopping-bag"
        disabled={addToShopping.busy}
        onClick={addToShopping.run}
      >
        {t('Thêm vào đi chợ')}
      </Button>
    </div>
  );
}
