import { useEngineQuery, type ShoppingItem } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { ContextSection, Icon, StickerTile } from '@alavo-daily/design-system';
import { Link } from 'react-router';

import { BudgetImpactSection } from '../../budget';
import { sourceRecipeNames } from '../logic/shoppingModel';

export interface ShoppingInsightsProps {
  today: string;
  items: readonly ShoppingItem[];
  neededCostVnd: number;
  logged: boolean;
}

export function ShoppingInsights({ today, items, neededCostVnd, logged }: ShoppingInsightsProps) {
  return (
    <>
      <BudgetImpactSection today={today} extraVnd={neededCostVnd} logged={logged} />
      <SourceRecipes items={items} />
    </>
  );
}

export function SourceRecipes({ items }: { items: readonly ShoppingItem[] }) {
  const t = useT();
  const names = sourceRecipeNames(items);
  const recipes = useEngineQuery('recipes.list');
  if (names.length === 0) return null;
  return (
    <ContextSection title={t('Từ những món nào ({{count}})', { count: names.length })} defaultOpen>
      <ul>
        {names.map((name) => {
          const recipe = recipes.data?.find((own) => own.name === name);
          return (
            <li key={name}>
              {recipe ? (
                <Link
                  to={`/recipes/list/${recipe.id}`}
                  className="focus-ring flex min-h-11 items-center gap-3 rounded-lg hover:bg-surface-tint"
                >
                  <StickerTile icon={recipe.icon} kind="recipe" size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
                  <Icon name="caret-right" />
                </Link>
              ) : (
                <span className="block py-2 text-sm">{name}</span>
              )}
            </li>
          );
        })}
      </ul>
    </ContextSection>
  );
}
