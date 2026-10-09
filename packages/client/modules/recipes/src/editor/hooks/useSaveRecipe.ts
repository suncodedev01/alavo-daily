import { useEngineMutation, type Recipe } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { useToast } from '@alavo-daily/design-system';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { describeEngineError } from '../../engine-errors';
import { draftToInput } from '../logic/draft';
import type { Draft } from '../types';
import type { SaveRecipe } from '../types';

/** `savedPhoto` is the photo the recipe had when the form opened, so it is only written when changed. */
export function useSaveRecipe(recipeId: string | undefined, savedPhoto: string | null): SaveRecipe {
  const t = useT();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const create = useEngineMutation('recipes.create');
  const update = useEngineMutation('recipes.update');
  const setPhoto = useEngineMutation('recipes.set_photo');

  const storeRecipe = (draft: Draft) => {
    const input = draftToInput(draft);
    if (recipeId === undefined) return create.mutateAsync(input);
    return update.mutateAsync({ id: recipeId, ...input });
  };

  const storePhoto = async (recipe: Recipe, photo: string | null): Promise<boolean> => {
    if (photo === savedPhoto) return true;
    return setPhoto.mutateAsync({ id: recipe.id, dataUrl: photo }).then(
      () => true,
      () => false,
    );
  };

  const finish = async (recipe: Recipe, draft: Draft) => {
    const photoSaved = await storePhoto(recipe, draft.photo);
    const name = recipe.name;
    toast(
      photoSaved
        ? t('Đã lưu công thức {{name}}', { name })
        : t('Đã lưu công thức {{name}}, nhưng chưa lưu được ảnh. Bạn thử thêm ảnh lại nhé.', { name }),
    );
    navigate(`/recipes/list/${recipe.id}`);
  };

  const submit = (draft: Draft) => {
    setError(null);
    setSaving(true);
    storeRecipe(draft)
      .then((recipe) => finish(recipe, draft))
      .catch((failure: unknown) => setError(describeEngineError(failure, t)))
      .finally(() => setSaving(false));
  };
  return { saving, error, submit };
}
