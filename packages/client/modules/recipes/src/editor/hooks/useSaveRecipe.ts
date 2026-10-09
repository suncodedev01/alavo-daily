import { useEngineMutation, type Recipe } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { useToast } from '@alavo-daily/design-system';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { describeEngineError } from '../../engine-errors';
import { draftToInput } from '../logic/draft';
import type { Draft } from '../types';
import type { SaveRecipe } from '../types';

export function useSaveRecipe(recipeId: string | undefined): SaveRecipe {
  const t = useT();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const create = useEngineMutation('recipes.create');
  const update = useEngineMutation('recipes.update');

  const saved = (recipe: Recipe) => {
    toast(t('Đã lưu công thức {{name}}', { name: recipe.name }));
    navigate(`/recipes/list/${recipe.id}`);
  };
  const failed = (failure: unknown) => setError(describeEngineError(failure, t));

  const submit = (draft: Draft) => {
    setError(null);
    const input = draftToInput(draft);
    const handlers = { onSuccess: saved, onError: failed };
    if (recipeId === undefined) create.mutate(input, handlers);
    else update.mutate({ id: recipeId, ...input }, handlers);
  };
  return { saving: create.isPending || update.isPending, error, submit };
}
