export const SPENDING_OVERVIEW_PATH = '/spending/overview';
export const RECIPES_PLAN_PATH = '/recipes/plan';
export const RECIPES_SHOPPING_PATH = '/recipes/shopping';

export function cookingPath(recipeId: string): string {
  return `/recipes/cook/${recipeId}`;
}
