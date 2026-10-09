import type { RecipeSummary } from '@alavo-daily/common/engine';

import { FAVORITES_TAG } from '../../vocabulary';
import type { RecipeQuery } from '../types';

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .trim();
}

export function filterRecipes(recipes: readonly RecipeSummary[], filter: RecipeQuery): RecipeSummary[] {
  const needle = normalizeText(filter.query);
  return recipes.filter(
    (recipe) => matchesTag(recipe, filter.tag) && normalizeText(recipe.name).includes(needle),
  );
}

function matchesTag(recipe: RecipeSummary, tag: string): boolean {
  if (tag === '') return true;
  if (tag === FAVORITES_TAG) return recipe.favorite;
  return recipe.tags.includes(tag);
}
