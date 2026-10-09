import type { Handlers } from '@alavo-daily/common/testing';
import {
  EngineCallError,
  type Aisle,
  type NewShoppingItem,
  type PlanEntry,
  type Recipe,
  type RecipeInput,
  type ShoppingItem,
  type ShoppingList,
  type SuggestedEntry,
  type SuggestPlanRequest,
} from '@alavo-daily/common/engine';

import { ALL_RECIPES, summaryOf } from './fixtures';

interface CustomItem {
  key: string;
  name: string;
  unit: string;
  aisle: Aisle;
  quantity: number;
}

export class RecipesBackend {
  recipes: Recipe[];
  plan: PlanEntry[] = [];
  customItems: CustomItem[] = [];
  haveFlags = new Map<string, boolean>();
  private counter = 0;

  constructor(recipes: Recipe[] = ALL_RECIPES) {
    this.recipes = recipes.map((own) => ({ ...own }));
  }

  handlers(): Handlers {
    return {
      'hub.get_settings': () => ({
        language: 'vi',
        theme: 'system',
        householdSize: 2,
        pinnedModules: [],
        recentModules: [],
      }),
      'recipes.list': () => this.recipes.map(summaryOf),
      'recipes.get': ({ id }) => this.find(id),
      'recipes.create': (input) => this.create(input),
      'recipes.update': ({ id, ...input }) => this.update(id, input),
      'recipes.delete': ({ id }) => this.remove(id),
      'recipes.set_favorite': ({ id, favorite }) => this.update(id, { favorite }),
      'recipes.set_photo': ({ id, dataUrl }) => this.setPhoto(id, dataUrl),
      'recipes.suggest_plan': (request) => this.suggestPlan(request),
      'recipes.get_plan': ({ from, days }) => this.planBetween(from, days ?? 7),
      'recipes.add_to_plan': (input) => this.addToPlan(input),
      'recipes.remove_from_plan': ({ id }) => {
        this.plan = this.plan.filter((entry) => entry.id !== id);
        return {};
      },
      'recipes.get_shopping_list': ({ from, to }) => this.shoppingList(from, to),
      'recipes.set_shopping_have': ({ key, have }) => {
        this.haveFlags.set(key, have);
        return {};
      },
      'recipes.add_shopping_item': (item) => this.addCustom(item),
      'recipes.remove_shopping_item': ({ key }) => {
        this.customItems = this.customItems.filter((item) => item.key !== key);
        return {};
      },
    };
  }

  setPhoto(id: string, photo: string | null): Recipe {
    const next = { ...this.find(id), photo };
    this.recipes = this.recipes.map((own) => (own.id === id ? next : own));
    return next;
  }

  /** A simple stand-in for the engine: fills empty meals by cycling through the recipes. */
  suggestPlan(request: SuggestPlanRequest): SuggestedEntry[] {
    const days = request.days ?? 7;
    const slots = request.slots ?? ['lunch', 'dinner'];
    const pool = this.recipes.filter((own) => !request.avoid?.includes(own.id));
    const choices = pool.length > 0 ? pool : this.recipes;
    const taken = [...this.plan, ...(request.alsoPlanned ?? [])];
    const entries: SuggestedEntry[] = [];
    for (let offset = 0; offset < days; offset += 1) {
      const date = addDaysText(request.from, offset);
      for (const slot of slots) {
        if (taken.some((own) => own.date === date && own.slot === slot) || choices.length === 0) continue;
        const pick = choices[(entries.length + (request.seed ?? 0)) % choices.length]!;
        entries.push({ date, slot, recipeId: pick.id, recipeName: pick.name, recipeIcon: pick.icon });
      }
    }
    return entries;
  }

  seedPlan(date: string, slot: PlanEntry['slot'], recipeId: string, servings = 2): PlanEntry {
    return this.addToPlan({ date, slot, recipeId, servings });
  }

  private find(id: string): Recipe {
    const found = this.recipes.find((own) => own.id === id);
    if (!found) throw new EngineCallError('not_found', `recipe ${id} not found`);
    return found;
  }

  private create(input: RecipeInput): Recipe {
    this.counter += 1;
    const created = this.fromInput(`new-${this.counter}`, input, false);
    this.recipes.push(created);
    return created;
  }

  private update(id: string, changes: Partial<RecipeInput> & { favorite?: boolean }): Recipe {
    const current = this.find(id);
    const { favorite, ...input } = changes;
    const next: Recipe = {
      ...current,
      ...this.fromInput(id, { ...toInput(current), ...input }, favorite ?? current.favorite),
      photo: current.photo,
      updatedAt: current.updatedAt + 1,
    };
    this.recipes = this.recipes.map((own) => (own.id === id ? next : own));
    return next;
  }

  private remove(id: string): Record<string, never> {
    this.find(id);
    this.recipes = this.recipes.filter((own) => own.id !== id);
    this.plan = this.plan.filter((entry) => entry.recipeId !== id);
    return {};
  }

  private fromInput(id: string, input: RecipeInput, favorite: boolean): Recipe {
    const ingredients = input.ingredients.map((item, index) => ({
      id: `${id}-i${index}`,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      aisle: item.aisle,
      costVnd: item.costVnd ?? 0,
      position: String(index),
    }));
    return {
      id,
      name: input.name,
      tags: input.tags,
      prepMin: input.prepMin,
      cookMin: input.cookMin,
      servings: input.servings,
      level: input.level ?? 'medium',
      favorite,
      icon: input.icon ?? 'cooking-pot',
      costVnd: ingredients.reduce((sum, item) => sum + item.costVnd, 0),
      ingredientCount: ingredients.length,
      kcal: input.kcal ?? null,
      note: input.note ?? '',
      ingredients,
      photo: null,
      steps: input.steps.map((own, index) => ({
        id: `${id}-s${index}`,
        text: own.text,
        timerMin: own.timerMin ?? 0,
        position: String(index),
      })),
      createdAt: 1,
      updatedAt: 1,
    };
  }

  private planBetween(from: string, days: number): PlanEntry[] {
    const last = addDaysText(from, days - 1);
    return this.plan.filter((entry) => entry.date >= from && entry.date <= last);
  }

  private addToPlan(input: { date: string; slot: PlanEntry['slot']; recipeId: string; servings?: number }): PlanEntry {
    const source = this.find(input.recipeId);
    this.counter += 1;
    const entry: PlanEntry = {
      id: `plan-${this.counter}`,
      date: input.date,
      slot: input.slot,
      recipeId: source.id,
      recipeName: source.name,
      recipeIcon: source.icon,
      servings: input.servings ?? 2,
    };
    this.plan.push(entry);
    return entry;
  }

  private addCustom(item: NewShoppingItem): Record<string, never> {
    const unit = item.unit ?? 'phần';
    this.customItems.push({
      key: `${item.name}|${unit}`,
      name: item.name,
      unit,
      aisle: item.aisle ?? 'other',
      quantity: item.quantity ?? 1,
    });
    return {};
  }

  shoppingList(from: string, to: string): ShoppingList {
    const merged = new Map<string, ShoppingItem>();
    for (const entry of this.plan.filter((own) => own.date >= from && own.date <= to)) {
      const source = this.find(entry.recipeId);
      for (const item of source.ingredients) this.mergeInto(merged, source, item, entry.servings);
    }
    for (const item of this.customItems) merged.set(item.key, this.customLine(item));
    const items = [...merged.values()];
    const needed = items.filter((item) => !item.have);
    return {
      from,
      to,
      items,
      neededCount: needed.length,
      neededCostVnd: needed.reduce((sum, item) => sum + item.costVnd, 0),
    };
  }

  private mergeInto(map: Map<string, ShoppingItem>, source: Recipe, item: Recipe['ingredients'][number], servings: number) {
    const key = `${item.name}|${item.unit}`;
    const ratio = servings / source.servings;
    const existing = map.get(key);
    map.set(key, {
      key,
      name: item.name,
      unit: item.unit,
      aisle: item.aisle,
      quantity: (existing?.quantity ?? 0) + item.quantity * ratio,
      costVnd: Math.round((existing?.costVnd ?? 0) + item.costVnd * ratio),
      from: existing && existing.from.includes(source.name) ? existing.from : [...(existing?.from ?? []), source.name],
      have: this.haveFlags.get(key) ?? item.aisle === 'spices',
      custom: false,
    });
  }

  private customLine(item: CustomItem): ShoppingItem {
    return {
      key: item.key,
      name: item.name,
      unit: item.unit,
      aisle: item.aisle,
      quantity: item.quantity,
      costVnd: 0,
      from: [],
      have: this.haveFlags.get(item.key) ?? false,
      custom: true,
    };
  }
}

function toInput(source: Recipe): RecipeInput {
  return {
    name: source.name,
    tags: source.tags,
    prepMin: source.prepMin,
    cookMin: source.cookMin,
    servings: source.servings,
    level: source.level,
    icon: source.icon,
    kcal: source.kcal,
    note: source.note,
    ingredients: source.ingredients,
    steps: source.steps,
  };
}

function addDaysText(date: string, days: number): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const next = new Date(year, month - 1, day + days);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}
