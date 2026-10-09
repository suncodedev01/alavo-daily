import type {
  Aisle,
  Recipe,
  RecipeInput,
  RecipeLevel,
} from '@alavo-daily/common/engine';

import { DEFAULT_UNIT } from '../../vocabulary';
import type { ChecklistItem, Draft, IngredientDraft, StepDraft } from '../types';

export const DEFAULT_TIMER_MIN = 10;
const DEFAULT_SERVINGS = 2;
const DEFAULT_QUANTITY = 1;

let rowCounter = 0;

function nextKey(): string {
  rowCounter += 1;
  return `row-${rowCounter}`;
}

export function blankIngredient(): IngredientDraft {
  return { key: nextKey(), quantity: '', unit: DEFAULT_UNIT, name: '', aisle: 'other', costVnd: 0 };
}

export function blankStep(): StepDraft {
  return { key: nextKey(), text: '', timerMin: 0 };
}

export function blankDraft(servings = DEFAULT_SERVINGS): Draft {
  return {
    name: '',
    tags: ['Món chính'],
    prepMin: '',
    cookMin: '',
    servings,
    level: 'medium',
    icon: 'cooking-pot',
    kcal: null,
    note: '',
    ingredients: [blankIngredient()],
    steps: [blankStep()],
    imported: false,
  };
}

export function draftFromInput(input: RecipeInput, imported: boolean): Draft {
  return {
    name: input.name,
    tags: input.tags,
    prepMin: String(input.prepMin),
    cookMin: String(input.cookMin),
    servings: input.servings,
    level: input.level ?? 'medium',
    icon: input.icon ?? 'cooking-pot',
    kcal: input.kcal ?? null,
    note: input.note ?? '',
    ingredients: input.ingredients.map((item) => ({
      key: nextKey(),
      quantity: String(item.quantity),
      unit: item.unit,
      name: item.name,
      aisle: item.aisle,
      costVnd: item.costVnd ?? 0,
    })),
    steps: input.steps.map((step) => ({ key: nextKey(), text: step.text, timerMin: step.timerMin ?? 0 })),
    imported,
  };
}

export function draftFromRecipe(recipe: Recipe): Draft {
  return draftFromInput(recipe, false);
}

export function parseQuantity(text: string): number {
  const value = Number(text.trim().replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_QUANTITY;
}

export function parseMinutes(text: string): number {
  const digits = text.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
}

export function draftToInput(draft: Draft): RecipeInput {
  return {
    name: draft.name.trim(),
    tags: draft.tags,
    prepMin: parseMinutes(draft.prepMin),
    cookMin: parseMinutes(draft.cookMin),
    servings: draft.servings,
    level: draft.level,
    icon: draft.icon,
    kcal: draft.kcal,
    note: draft.note,
    ingredients: draft.ingredients
      .filter((item) => item.name.trim() !== '')
      .map((item) => ({
        name: item.name.trim(),
        quantity: parseQuantity(item.quantity),
        unit: item.unit,
        aisle: item.aisle,
        costVnd: item.costVnd,
      })),
    steps: draft.steps
      .filter((step) => step.text.trim() !== '')
      .map((step) => ({ text: step.text.trim(), timerMin: step.timerMin })),
  };
}

export function checklistOf(draft: Draft): ChecklistItem[] {
  return [
    { label: 'Có tên món', done: draft.name.trim() !== '' },
    { label: 'Ít nhất 1 nguyên liệu có tên', done: draft.ingredients.some((item) => item.name.trim() !== '') },
    { label: 'Ít nhất 1 bước làm', done: draft.steps.some((step) => step.text.trim() !== '') },
  ];
}

export function isDraftValid(draft: Draft): boolean {
  return checklistOf(draft).every((item) => item.done);
}
