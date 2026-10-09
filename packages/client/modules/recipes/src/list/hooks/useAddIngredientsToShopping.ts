import { useEngineMutation, type Recipe } from '@alavo-daily/common/engine';
import { scaleQuantity } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { useToast } from '@alavo-daily/design-system';
import { useState } from 'react';

import { useReportError } from '../../engine-errors';

export function useAddIngredientsToShopping(recipe: Recipe, servings: number) {
  const t = useT();
  const { toast } = useToast();
  const reportError = useReportError();
  const [busy, setBusy] = useState(false);
  const addItem = useEngineMutation('recipes.add_shopping_item');
  const run = async () => {
    setBusy(true);
    try {
      for (const item of recipe.ingredients) {
        const quantity = scaleQuantity(item.quantity, recipe.servings, servings);
        await addItem.mutateAsync({
          name: item.name,
          quantity: Math.round(quantity * 100) / 100,
          unit: item.unit,
          aisle: item.aisle,
        });
      }
      toast(t('Đã thêm {{count}} nguyên liệu vào danh sách đi chợ', { count: recipe.ingredients.length }));
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  };
  return { busy, run: () => void run() };
}
