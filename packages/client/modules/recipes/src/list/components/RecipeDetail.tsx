import { useEngineQuery, type Recipe } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Card, IconButton, PageColumn, Skeleton, useLayout } from '@alavo-daily/design-system';
import { useNavigate } from 'react-router';

import { QueryState } from '../../query-state';
import { RecipeActions } from './RecipeActions';
import { RecipeDock } from './RecipeDock';
import { IngredientList, RecipeCover, RecipeHeading, RecipeMeta, StepList } from './RecipeParts';

export interface RecipeDetailProps {
  id: string;
  servings: number;
  onServingsChange: (servings: number) => void;
}

export function RecipeDetail({ id, servings, onServingsChange }: RecipeDetailProps) {
  const recipe = useEngineQuery('recipes.get', { id });
  return (
    <QueryState query={recipe} skeleton={<DetailSkeleton />}>
      {(loaded) => (
        <RecipeView recipe={loaded} servings={servings} onServingsChange={onServingsChange} />
      )}
    </QueryState>
  );
}

interface RecipeViewProps {
  recipe: Recipe;
  servings: number;
  onServingsChange: (servings: number) => void;
}

function RecipeView({ recipe, servings, onServingsChange }: RecipeViewProps) {
  const layout = useLayout();
  return (
    <PageColumn maxWidth="page" className="gap-6">
      {layout === 'narrow' ? <BackToList /> : null}
      <RecipeCover recipe={recipe} />
      <RecipeHeading recipe={recipe} />
      <RecipeMeta recipe={recipe} servings={servings} onServingsChange={onServingsChange} />
      <RecipeActions recipe={recipe} servings={servings} />
      <div className="@container"><div className="grid items-start gap-4 @2xl:grid-cols-2">
        <IngredientList recipe={recipe} servings={servings} />
        <StepList recipe={recipe} />
      </div></div>
      {layout === 'narrow' ? (
        <Card padding="none" className="empty:hidden">
          <RecipeDock id={recipe.id} servings={servings} />
        </Card>
      ) : null}
    </PageColumn>
  );
}

function BackToList() {
  const t = useT();
  const navigate = useNavigate();
  return (
    <div>
      <IconButton
        icon="caret-left"
        label={t('Quay lại danh sách')}
        variant="surface"
        onClick={() => navigate('/recipes/list')}
      />
    </div>
  );
}

function DetailSkeleton() {
  const t = useT();
  return (
    <div role="status" aria-label={t('Đang tải')} className="grid gap-4">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
