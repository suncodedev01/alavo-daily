import type { RecipeSummary } from '@alavo-daily/common/engine';
import { formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import {
  Button,
  cn,
  EmptyState,
  Icon,
  IconTile,
  Pill,
  SearchField,
  useLayout,
} from '@alavo-daily/design-system';
import { Link, useNavigate } from 'react-router';

import { filterRecipes } from '../../recipe-filter';
import { costForServings, totalTimeText } from '../../recipe-math';
import { QueryState, type QueryLike } from '../../query-state';
import { FILTER_TAGS, LEVEL_LABELS } from '../../vocabulary';
import { useRecipeQuery } from '../hooks/useRecipeQuery';

export interface RecipeListPaneProps {
  query: QueryLike<RecipeSummary[]>;
  selectedId: string | undefined;
  householdSize: number;
}

export function RecipeListPane({ query, selectedId, householdSize }: RecipeListPaneProps) {
  const t = useT();
  const [filter, update] = useRecipeQuery();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid gap-2 px-4 pt-3 pb-2">
        <SearchField
          value={filter.query}
          onValueChange={(value) => update({ query: value })}
          placeholder={t('Tìm công thức')}
          label={t('Tìm công thức')}
          clearLabel={t('Xoá tìm kiếm')}
        />
        <div role="group" aria-label={t('Lọc theo nhóm')} className="flex flex-wrap gap-1">
          {FILTER_TAGS.map(({ value, label }) => (
            <Pill key={value} selected={filter.tag === value} onClick={() => update({ tag: value })}>
              {t(label)}
            </Pill>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <QueryState query={query}>
          {(recipes) => (
            <RecipeRows recipes={recipes} selectedId={selectedId} householdSize={householdSize} />
          )}
        </QueryState>
      </div>
    </div>
  );
}

interface RecipeRowsProps {
  recipes: RecipeSummary[];
  selectedId: string | undefined;
  householdSize: number;
}

function RecipeRows({ recipes, selectedId, householdSize }: RecipeRowsProps) {
  const t = useT();
  const [filter, , search] = useRecipeQuery();
  const shown = filterRecipes(recipes, filter);
  if (recipes.length === 0) return <NoRecipes />;
  if (shown.length === 0) {
    return <p className="px-2 py-6 text-center text-sm text-text-muted">{t('Không có công thức khớp.')}</p>;
  }
  return (
    <>
      <p className="px-2 pb-1 text-xs text-text-muted">
        {t('{{shown}}/{{total}} công thức', { shown: shown.length, total: recipes.length })}
      </p>
      <ul className="grid gap-0.5" aria-label={t('Danh sách công thức')}>
        {shown.map((recipe) => (
          <li key={recipe.id}>
            <RecipeRow
              recipe={recipe}
              selected={recipe.id === selectedId}
              search={search}
              householdSize={householdSize}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

interface RecipeRowProps {
  recipe: RecipeSummary;
  selected: boolean;
  search: string;
  householdSize: number;
}

function RecipeRow({ recipe, selected, search, householdSize }: RecipeRowProps) {
  const t = useT();
  const cost = costForServings(recipe, householdSize);
  const meta = [totalTimeText(recipe), t(LEVEL_LABELS[recipe.level]), cost > 0 ? formatVnd(cost) : null]
    .filter((part) => part !== null)
    .join(' · ');
  return (
    <Link
      to={{ pathname: `/recipes/list/${recipe.id}`, search }}
      aria-current={selected ? 'page' : undefined}
      className={cn(
        'focus-ring flex min-h-14 items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-tint',
        selected && 'bg-accent text-accent-fg hover:bg-accent',
      )}
    >
      <IconTile icon={recipe.icon} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{recipe.name}</span>
        <span className="block truncate text-xs text-text-muted">{meta}</span>
      </span>
      {recipe.favorite ? <Icon name="heart" weight="fill" label={t('Yêu thích')} className="text-primary" /> : null}
    </Link>
  );
}

function NoRecipes() {
  const t = useT();
  const navigate = useNavigate();
  const layout = useLayout();
  if (layout === 'wide') {
    return <p className="px-2 py-6 text-center text-sm text-text-muted">{t('Chưa có công thức nào.')}</p>;
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
