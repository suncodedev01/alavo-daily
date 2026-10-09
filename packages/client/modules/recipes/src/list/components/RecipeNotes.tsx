import { useEngineMutation, type Recipe } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, TextArea, useToast } from '@alavo-daily/design-system';
import { useState } from 'react';

import { recipeToInput } from '../../recipe-input';
import { useReportError } from '../../engine-errors';

export function RecipeNotes({ recipe }: { recipe: Recipe }) {
  const t = useT();
  const { toast } = useToast();
  const reportError = useReportError();
  const [note, setNote] = useState(recipe.note);
  const update = useEngineMutation('recipes.update');
  const save = () =>
    update.mutate(
      { id: recipe.id, ...recipeToInput(recipe, { note }) },
      { onSuccess: () => toast(t('Đã lưu ghi chú')), onError: reportError },
    );
  return (
    <div className="grid gap-2">
      <TextArea
        aria-label={t('Ghi chú')}
        placeholder={t('Mẹo riêng của bạn, ví dụ: bớt đường nếu gà ngọt…')}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <Button
        size="sm"
        variant="outline"
        className="justify-self-start"
        disabled={note === recipe.note || update.isPending}
        onClick={save}
      >
        {t('Lưu ghi chú')}
      </Button>
    </div>
  );
}
