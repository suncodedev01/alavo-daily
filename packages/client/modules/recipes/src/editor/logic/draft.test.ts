import { describe, expect, it } from 'vitest';

import { GA_KHO } from '../../testing/fixtures';
import {
  blankDraft,
  checklistOf,
  draftFromRecipe,
  draftToInput,
  isDraftValid,
  parseMinutes,
  parseQuantity,
} from './draft';

function filledDraft() {
  const draft = blankDraft();
  return {
    ...draft,
    name: '  Bò kho  ',
    prepMin: '20',
    cookMin: '90 phút',
    ingredients: [
      { ...draft.ingredients[0]!, name: 'Bắp bò', quantity: '0,5', unit: 'kg', aisle: 'meat_fish' as const },
      { ...draft.ingredients[0]!, key: 'blank', name: '   ' },
    ],
    steps: [
      { ...draft.steps[0]!, text: 'Ướp bò', timerMin: 30 },
      { ...draft.steps[0]!, key: 'blank-step', text: '' },
    ],
  };
}

describe('parseQuantity', () => {
  it('accepts a decimal comma', () => {
    expect(parseQuantity('1,5')).toBe(1.5);
  });

  it('falls back to 1 for empty, zero, negative or broken text', () => {
    for (const text of ['', '  ', '0', '-2', 'abc']) expect(parseQuantity(text)).toBe(1);
  });
});

describe('parseMinutes', () => {
  it('keeps only the digits', () => {
    expect(parseMinutes('90 phút')).toBe(90);
    expect(parseMinutes('')).toBe(0);
  });
});

describe('draftToInput', () => {
  it('trims the name, drops blank rows and parses the numbers', () => {
    expect(draftToInput(filledDraft())).toMatchObject({
      name: 'Bò kho',
      prepMin: 20,
      cookMin: 90,
      servings: 2,
      ingredients: [{ name: 'Bắp bò', quantity: 0.5, unit: 'kg', aisle: 'meat_fish', costVnd: 0 }],
      steps: [{ text: 'Ướp bò', timerMin: 30 }],
    });
  });
});

describe('draftFromRecipe', () => {
  it('round trips a stored recipe', () => {
    const input = draftToInput(draftFromRecipe(GA_KHO));
    expect(input.name).toBe(GA_KHO.name);
    expect(input.ingredients).toHaveLength(3);
    expect(input.steps.map((step) => step.timerMin)).toEqual([15, 5, 0]);
    expect(input.kcal).toBe(420);
  });
});

describe('checklist', () => {
  it('starts with nothing done', () => {
    expect(checklistOf(blankDraft()).map((item) => item.done)).toEqual([false, false, false]);
    expect(isDraftValid(blankDraft())).toBe(false);
  });

  it('is valid once the name, an ingredient and a step are there', () => {
    expect(isDraftValid(filledDraft())).toBe(true);
  });

  it('ignores rows with only spaces', () => {
    const draft = { ...filledDraft(), ingredients: [{ ...filledDraft().ingredients[1]! }] };
    expect(checklistOf(draft)[1]?.done).toBe(false);
  });
});
