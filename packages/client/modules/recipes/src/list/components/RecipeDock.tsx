import { useEngineMutation, useEngineQuery, type Recipe } from '@alavo-daily/common/engine';
import {
  dayAndMonth,
  formatVnd,
  startOfWeek,
  weekdayShort,
} from '@alavo-daily/common/format';
import { useLanguage, useT } from '@alavo-daily/common';
import { Button, ConfirmDialog, ContextSection, useToast } from '@alavo-daily/design-system';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useFoodBudgetLine } from '../../budget';
import { ListSkeleton, QueryState } from '../../query-state';
import { costForServings, sharePercent } from '../../recipe-math';
import { useReportError } from '../../engine-errors';
import { useToday } from '../../today';
import { PLAN_DAYS, SLOT_LABELS } from '../../vocabulary';
import { RecipeNotes } from './RecipeNotes';

export interface RecipeDockProps {
  id: string;
  servings: number;
}

export function RecipeDock({ id, servings }: RecipeDockProps) {
  const recipe = useEngineQuery('recipes.get', { id });
  return (
    <QueryState query={recipe} skeleton={<ListSkeleton rows={3} />}>
      {(loaded) => (
        <>
          <CostSection recipe={loaded} servings={servings} />
          <NutritionSection recipe={loaded} />
          <WeekPlanSection recipe={loaded} />
          <NotesSection recipe={loaded} />
          <DeleteRecipe recipe={loaded} />
        </>
      )}
    </QueryState>
  );
}

function NotesSection({ recipe }: { recipe: Recipe }) {
  const t = useT();
  return (
    <ContextSection title={t('Ghi chú')} defaultOpen>
      <RecipeNotes key={recipe.updatedAt} recipe={recipe} />
    </ContextSection>
  );
}

function CostSection({ recipe, servings }: { recipe: Recipe; servings: number }) {
  const t = useT();
  const today = useToday();
  const line = useFoodBudgetLine(today);
  const cost = costForServings(recipe, servings);
  return (
    <ContextSection title={t('Chi phí ước tính')} defaultOpen>
      {cost > 0 ? (
        <div className="grid gap-1">
          <p className="text-2xl font-semibold">{formatVnd(cost)}</p>
          <p className="text-sm text-text-muted">
            {t('cho {{count}} người · {{each}} mỗi người', {
              count: servings,
              each: formatVnd(Math.round(cost / servings)),
            })}
          </p>
          {line ? <BudgetShare cost={cost} remainingVnd={line.budgetVnd - line.spentVnd} /> : null}
        </div>
      ) : (
        <p className="text-sm text-text-muted">{t('Chưa có chi phí ước tính cho món này.')}</p>
      )}
    </ContextSection>
  );
}

function BudgetShare({ cost, remainingVnd }: { cost: number; remainingVnd: number }) {
  const t = useT();
  const text =
    remainingVnd > 0
      ? t('Bằng {{percent}}% số tiền còn lại của ngân sách Ăn uống tháng này ({{remaining}}).', {
          percent: sharePercent(cost, remainingVnd),
          remaining: formatVnd(remainingVnd),
        })
      : t('Ngân sách Ăn uống tháng này đã dùng hết.');
  return <p className="mt-2 text-sm text-text-secondary">{text}</p>;
}

function NutritionSection({ recipe }: { recipe: Recipe }) {
  const t = useT();
  if (recipe.kcal === null) return null;
  return (
    <ContextSection title={t('Dinh dưỡng mỗi khẩu phần')} defaultOpen>
      <p className="text-title font-semibold">{t('{{kcal}} kcal', { kcal: recipe.kcal })}</p>
    </ContextSection>
  );
}

function WeekPlanSection({ recipe }: { recipe: Recipe }) {
  const language = useLanguage();
  const t = useT();
  const today = useToday();
  const plan = useEngineQuery('recipes.get_plan', { from: startOfWeek(today), days: PLAN_DAYS });
  const entries = (plan.data ?? []).filter((entry) => entry.recipeId === recipe.id);
  return (
    <ContextSection title={t('Trong thực đơn tuần ({{count}})', { count: entries.length })} defaultOpen>
      {entries.length === 0 ? (
        <p className="text-sm text-text-muted">{t('Chưa có trong thực đơn.')}</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li key={entry.id} className="py-1 text-sm">
              {`${weekdayShort(entry.date, language)} ${dayAndMonth(entry.date, language)} · ${t(SLOT_LABELS[entry.slot])}`}
            </li>
          ))}
        </ul>
      )}
    </ContextSection>
  );
}

function DeleteRecipe({ recipe }: { recipe: Recipe }) {
  const t = useT();
  const navigate = useNavigate();
  const { toast } = useToast();
  const reportError = useReportError();
  const [asking, setAsking] = useState(false);
  const remove = useEngineMutation('recipes.delete');
  const confirm = () =>
    remove.mutate(
      { id: recipe.id },
      {
        onSuccess: () => {
          toast(t('Đã xoá công thức {{name}}', { name: recipe.name }));
          navigate('/recipes/list');
        },
        onError: reportError,
      },
    );
  return (
    <div className="flex flex-wrap gap-2 px-4 py-4">
      <Button variant="outline" leadingIcon="pencil-simple" onClick={() => navigate(`/recipes/edit/${recipe.id}`)}>
        {t('Sửa công thức')}
      </Button>
      <Button variant="destructive-outline" leadingIcon="trash" onClick={() => setAsking(true)}>
        {t('Xoá công thức')}
      </Button>
      <ConfirmDialog
        open={asking}
        onOpenChange={setAsking}
        title={t('Xoá công thức này?')}
        description={t('{{name}} cũng sẽ bị gỡ khỏi thực đơn. Không hoàn tác được.', { name: recipe.name })}
        confirmLabel={t('Xoá')}
        cancelLabel={t('Huỷ')}
        destructive
        onConfirm={confirm}
      />
    </div>
  );
}
