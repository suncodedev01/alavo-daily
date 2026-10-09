import { useEngineQuery } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Screen } from '@alavo-daily/common/shell';
import { Button, EmptyState, useLayout } from '@alavo-daily/design-system';
import { Navigate, useNavigate, useParams } from 'react-router';

import { filterRecipes } from '../../recipe-filter';
import { useHouseholdSize } from '../../household';
import { RecipeDetail } from './RecipeDetail';
import { RecipeDock } from './RecipeDock';
import { RecipeListPane } from './RecipeListPane';
import { useRecipeQuery } from '../hooks/useRecipeQuery';
import { useServings } from '../hooks/useServings';

export function RecipeListScreen() {
  const t = useT();
  const layout = useLayout();
  const navigate = useNavigate();
  const { id } = useParams();
  const [filter, , search] = useRecipeQuery();
  const recipes = useEngineQuery('recipes.list');
  const householdSize = useHouseholdSize();
  const [servings, setServings] = useServings(id, householdSize);
  const firstShown = filterRecipes(recipes.data ?? [], filter)[0];
  if (layout === 'wide' && id === undefined && firstShown) {
    return <Navigate replace to={{ pathname: `/recipes/list/${firstShown.id}`, search }} />;
  }
  return (
    <Screen
      title={t('Công thức')}
      listLabel={t('Danh sách công thức')}
      narrowShows={id === undefined ? 'list' : 'main'}
      actions={
        <Button size="sm" leadingIcon="plus" onClick={() => navigate('/recipes/new')}>
          {t('Công thức mới')}
        </Button>
      }
      list={<RecipeListPane query={recipes} selectedId={id} householdSize={householdSize} />}
      dock={id !== undefined && layout === 'wide' ? <RecipeDock key={id} id={id} servings={servings} /> : undefined}
    >
      {id === undefined ? (
        <NothingSelected empty={recipes.data?.length === 0} />
      ) : (
        <RecipeDetail key={id} id={id} servings={servings} onServingsChange={setServings} />
      )}
    </Screen>
  );
}

function NothingSelected({ empty }: { empty: boolean }) {
  const t = useT();
  const navigate = useNavigate();
  if (!empty) {
    return <p className="py-12 text-center text-sm text-text-muted">{t('Chọn một công thức để xem.')}</p>;
  }
  return (
    <EmptyState
      icon="book-open"
      title={t('Chưa có công thức nào')}
      description={t('Thêm công thức đầu tiên của bạn, hoặc nạp dữ liệu mẫu trong Cài đặt.')}
      action={
        <Button leadingIcon="plus" onClick={() => navigate('/recipes/new')}>
          {t('Thêm công thức')}
        </Button>
      }
    />
  );
}
