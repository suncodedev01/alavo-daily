import { useEngineMutation, type PlanEntry } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Menu, MenuItem, useToast } from '@alavo-daily/design-system';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';

import { useReportError } from '../../engine-errors';

export function MealMenu({ entry, trigger }: { entry: PlanEntry; trigger: ReactElement }) {
  const t = useT();
  const navigate = useNavigate();
  const { toast } = useToast();
  const reportError = useReportError();
  const remove = useEngineMutation('recipes.remove_from_plan');
  const removeEntry = () =>
    remove.mutate(
      { id: entry.id },
      {
        onSuccess: () => toast(t('Đã gỡ {{name}} khỏi thực đơn', { name: entry.recipeName })),
        onError: reportError,
      },
    );
  return (
    <Menu trigger={trigger}>
      <MenuItem icon="book-open" onSelect={() => navigate(`/recipes/list/${entry.recipeId}`)}>
        {t('Xem công thức')}
      </MenuItem>
      <MenuItem
        icon="play"
        onSelect={() => navigate(`/recipes/cook/${entry.recipeId}?servings=${entry.servings}`)}
      >
        {t('Bắt đầu nấu')}
      </MenuItem>
      <MenuItem icon="trash" destructive onSelect={removeEntry}>
        {t('Xoá khỏi thực đơn')}
      </MenuItem>
    </Menu>
  );
}
