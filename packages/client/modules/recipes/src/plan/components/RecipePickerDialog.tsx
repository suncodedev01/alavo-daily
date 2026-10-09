import { useEngineMutation, type RecipeSummary } from '@alavo-daily/common/engine';
import { relativeDayLabel } from '@alavo-daily/common/format';
import { useLanguage, useT } from '@alavo-daily/common';
import {
  StickerTile,
  ResponsiveDialog,
  SearchField,
  useToast,
} from '@alavo-daily/design-system';
import { useState } from 'react';

import { filterRecipes } from '../../recipe-filter';
import { knownTimeText } from '../../recipe-math';
import { useReportError } from '../../engine-errors';
import { SLOT_LABELS } from '../../vocabulary';
import type { PlanTarget } from '../types';

export interface RecipePickerDialogProps {
  target: PlanTarget | null;
  today: string;
  recipes: readonly RecipeSummary[];
  servings: number;
  onClose: () => void;
}

export function RecipePickerDialog({ target, today, recipes, servings, onClose }: RecipePickerDialogProps) {
  const language = useLanguage();
  const t = useT();
  const title = target
    ? t('Thêm món vào {{day}}, bữa {{slot}}', {
        day: relativeDayLabel(target.date, today, language),
        slot: t(SLOT_LABELS[target.slot]),
      })
    : t('Thêm món');
  return (
    <ResponsiveDialog
      open={target !== null}
      onOpenChange={(open) => !open && onClose()}
      title={title}
      closeLabel={t('Đóng')}
    >
      {target ? (
        <PickerBody target={target} recipes={recipes} servings={servings} onDone={onClose} />
      ) : null}
    </ResponsiveDialog>
  );
}

interface PickerBodyProps {
  target: PlanTarget;
  recipes: readonly RecipeSummary[];
  servings: number;
  onDone: () => void;
}

function PickerBody({ target, recipes, servings, onDone }: PickerBodyProps) {
  const language = useLanguage();
  const t = useT();
  const { toast } = useToast();
  const reportError = useReportError();
  const [query, setQuery] = useState('');
  const addToPlan = useEngineMutation('recipes.add_to_plan');
  const shown = filterRecipes(recipes, { query, tag: '' });
  const pick = (recipe: RecipeSummary) =>
    addToPlan.mutate(
      { ...target, recipeId: recipe.id, servings },
      {
        onSuccess: () => {
          toast(t('Đã thêm {{name}} vào thực đơn', { name: recipe.name }));
          onDone();
        },
        onError: reportError,
      },
    );
  return (
    <div className="grid gap-3">
      <SearchField
        value={query}
        onValueChange={setQuery}
        label={t('Tìm công thức')}
        placeholder={t('Tìm công thức')}
        clearLabel={t('Xoá tìm kiếm')}
      />
      {shown.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">
          {recipes.length === 0 ? t('Chưa có công thức nào để thêm.') : t('Không có công thức khớp.')}
        </p>
      ) : (
        <ul aria-label={t('Danh sách công thức')} className="grid max-h-80 gap-0.5 overflow-y-auto max-lg:max-h-none max-lg:overflow-visible">
          {shown.map((recipe) => (
            <li key={recipe.id}>
              <button
                type="button"
                className="focus-ring flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left hover:bg-surface-tint"
                onClick={() => pick(recipe)}
              >
                <StickerTile icon={recipe.icon} kind="recipe" size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{recipe.name}</span>
                  <span className="block min-h-4 text-xs text-text-muted">{knownTimeText(recipe, language)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
