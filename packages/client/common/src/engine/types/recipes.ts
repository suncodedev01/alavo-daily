/** Dates are local calendar dates `YYYY-MM-DD`. Quantities may be fractional, money is whole đồng. */

export type RecipeLevel = 'easy' | 'medium' | 'hard';

/** Where an ingredient is bought. The UI translates these keys. */
export type Aisle = 'meat_fish' | 'vegetables' | 'spices' | 'other';

export interface Ingredient {
  id: string;
  name: string;
  /** For the recipe's own `servings`. Scale by `wanted / servings`. */
  quantity: number;
  unit: string;
  aisle: Aisle;
  /** Estimated cost for the recipe's own `servings`. 0 when unknown. */
  costVnd: number;
  /** Fractional index: sorts as text, lets an item be inserted between two others. */
  position: string;
}

export interface Step {
  id: string;
  text: string;
  /** Minutes for a countdown timer, 0 for none. */
  timerMin: number;
  position: string;
}

export interface RecipeSummary {
  id: string;
  name: string;
  tags: string[];
  prepMin: number;
  cookMin: number;
  /** The servings the ingredient quantities were written for. */
  servings: number;
  level: RecipeLevel;
  favorite: boolean;
  /** Phosphor icon name in kebab-case, shown when the recipe has no photo. */
  icon: string;
  /** Sum of ingredient costs for `servings`. */
  costVnd: number;
  ingredientCount: number;
}

export interface Recipe extends RecipeSummary {
  kcal: number | null;
  note: string;
  ingredients: Ingredient[];
  steps: Step[];
  /** A data URL of an image under 400 KB. Only `recipes.get` returns it: the list stays light. */
  photo: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface IngredientInput {
  name: string;
  quantity: number;
  unit: string;
  aisle: Aisle;
  costVnd?: number;
}

export interface StepInput {
  text: string;
  timerMin?: number;
}

export interface RecipeInput {
  name: string;
  tags: string[];
  prepMin: number;
  cookMin: number;
  servings: number;
  level?: RecipeLevel;
  icon?: string;
  kcal?: number | null;
  note?: string;
  ingredients: IngredientInput[];
  steps: StepInput[];
}

export interface RecipeFilter {
  /** Case-insensitive match on the name. */
  query?: string;
  /** A tag, or the special value `favorites`. */
  tag?: string;
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner';

export interface PlanEntry {
  id: string;
  date: string;
  slot: MealSlot;
  recipeId: string;
  recipeName: string;
  recipeIcon: string;
  servings: number;
}

export type MenuSource = 'planned' | 'suggested' | 'empty';

export interface MenuDish {
  recipeId: string;
  name: string;
  icon: string;
  /** The planned meal; null for a suggestion. */
  slot: MealSlot | null;
}

/** What to tell the person on the morning of `date`. */
export interface MorningMenu {
  date: string;
  source: MenuSource;
  dishes: MenuDish[];
}

export interface NewPlanEntry {
  date: string;
  slot: MealSlot;
  recipeId: string;
  /** Defaults to the household size. */
  servings?: number;
}

export interface ShoppingItem {
  /** `<name>|<unit>`, stable across recalculation. */
  key: string;
  name: string;
  unit: string;
  aisle: Aisle;
  /** Summed over every planned recipe in the range, scaled to each entry's servings. */
  quantity: number;
  costVnd: number;
  /** Names of the recipes that need it. `[]` for a hand-added item. */
  from: string[];
  /** Already at home, so it does not need buying. Spices default to `true`. */
  have: boolean;
  custom: boolean;
}

export interface ShoppingList {
  from: string;
  to: string;
  items: ShoppingItem[];
  neededCount: number;
  neededCostVnd: number;
}

export interface NewShoppingItem {
  name: string;
  quantity?: number;
  unit?: string;
  aisle?: Aisle;
}

export interface LogShoppingExpense {
  from: string;
  to: string;
  walletId: string;
  categoryId: string;
  occurredOn: string;
  title?: string;
}

export interface SuggestPlanRequest {
  from: string;
  /** Default 7. */
  days?: number;
  /** Meals to fill. Default lunch and dinner. */
  slots?: MealSlot[];
  /** The same seed gives the same proposal; another seed gives another one. Default 0. */
  seed?: number;
  /** Meals proposed elsewhere: they count for spacing and variety but are not returned. */
  alsoPlanned?: { date: string; slot: MealSlot; recipeId: string }[];
  /** Recipes not to propose, unless that would leave nothing to propose. */
  avoid?: string[];
}

/** A proposed meal that is not saved yet. Apply it with `recipes.add_to_plan`. */
export interface SuggestedEntry {
  date: string;
  slot: MealSlot;
  recipeId: string;
  recipeName: string;
  recipeIcon: string;
}
