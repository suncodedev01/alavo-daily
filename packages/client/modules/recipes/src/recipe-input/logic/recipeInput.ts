import type { Recipe, RecipeInput } from '@alavo-daily/common/engine';

export function recipeToInput(recipe: Recipe, changes: Partial<RecipeInput> = {}): RecipeInput {
  return {
    name: recipe.name,
    tags: recipe.tags,
    prepMin: recipe.prepMin,
    cookMin: recipe.cookMin,
    servings: recipe.servings,
    level: recipe.level,
    icon: recipe.icon,
    kcal: recipe.kcal,
    note: recipe.note,
    ingredients: recipe.ingredients.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      aisle: item.aisle,
      costVnd: item.costVnd,
    })),
    steps: recipe.steps.map((step) => ({ text: step.text, timerMin: step.timerMin })),
    ...changes,
  };
}
