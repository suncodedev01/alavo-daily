import { MAX_SERVINGS, MIN_SERVINGS } from '../../vocabulary';
import { blankIngredient, blankStep, DEFAULT_TIMER_MIN } from './draft';
import type { Draft, DraftAction, IngredientDraft, StepDraft } from '../types';

export function draftReducer(draft: Draft, action: DraftAction): Draft {
  switch (action.type) {
    case 'replace':
      return action.draft;
    case 'set_field':
      return { ...draft, [action.field]: action.value };
    case 'set_servings':
      return { ...draft, servings: clampServings(action.servings) };
    case 'toggle_tag':
      return { ...draft, tags: toggled(draft.tags, action.tag) };
    case 'set_photo':
      return { ...draft, photo: action.photo };
    default:
      return reduceRows(draft, action);
  }
}

function reduceRows(draft: Draft, action: DraftAction): Draft {
  switch (action.type) {
    case 'add_ingredient':
      return { ...draft, ingredients: [...draft.ingredients, blankIngredient()] };
    case 'edit_ingredient':
      return { ...draft, ingredients: editRow(draft.ingredients, action.key, action.changes) };
    case 'remove_ingredient':
      return { ...draft, ingredients: removeRow(draft.ingredients, action.key, blankIngredient) };
    default:
      return reduceSteps(draft, action);
  }
}

function reduceSteps(draft: Draft, action: DraftAction): Draft {
  switch (action.type) {
    case 'add_step':
      return { ...draft, steps: [...draft.steps, blankStep()] };
    case 'edit_step':
      return { ...draft, steps: editRow(draft.steps, action.key, action.changes) };
    case 'toggle_timer':
      return { ...draft, steps: toggleTimer(draft.steps, action.key) };
    case 'move_step':
      return { ...draft, steps: moveRow(draft.steps, action.key, action.by) };
    case 'remove_step':
      return { ...draft, steps: removeRow(draft.steps, action.key, blankStep) };
    default:
      return draft;
  }
}

function clampServings(servings: number): number {
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, servings));
}

function toggled(items: string[], item: string): string[] {
  return items.includes(item) ? items.filter((own) => own !== item) : [...items, item];
}

function editRow<Row extends { key: string }>(
  rows: Row[],
  key: string,
  changes: Partial<Omit<Row, 'key'>>,
): Row[] {
  return rows.map((row) => (row.key === key ? { ...row, ...changes } : row));
}

function removeRow<Row extends { key: string }>(rows: Row[], key: string, blank: () => Row): Row[] {
  const rest = rows.filter((row) => row.key !== key);
  return rest.length === 0 ? [blank()] : rest;
}

function toggleTimer(steps: StepDraft[], key: string): StepDraft[] {
  return steps.map((step) =>
    step.key === key ? { ...step, timerMin: step.timerMin > 0 ? 0 : DEFAULT_TIMER_MIN } : step,
  );
}

export function moveRow<Row extends { key: string }>(rows: Row[], key: string, by: -1 | 1): Row[] {
  const from = rows.findIndex((row) => row.key === key);
  const to = from + by;
  const moving = rows[from];
  const target = rows[to];
  if (moving === undefined || target === undefined) return rows;
  const next = [...rows];
  next[from] = target;
  next[to] = moving;
  return next;
}
