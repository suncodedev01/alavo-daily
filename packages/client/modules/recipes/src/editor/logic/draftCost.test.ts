import { describe, expect, it } from 'vitest';

import { blankDraft, blankIngredient } from './draft';
import { draftCost } from './draftCost';
import type { Draft, IngredientDraft } from '../types';

function draftWith(servings: number, rows: Partial<IngredientDraft>[]): Draft {
  return { ...blankDraft(servings), ingredients: rows.map((row) => ({ ...blankIngredient(), ...row })) };
}

describe('draftCost', () => {
  it('is zero for a new recipe', () => {
    expect(draftCost(blankDraft())).toEqual({ totalVnd: 0, perServingVnd: 0 });
  });

  it('adds the cost of every named ingredient', () => {
    const draft = draftWith(4, [
      { name: 'Đùi gà', costVnd: 54000 },
      { name: 'Nước mắm', costVnd: 3000 },
    ]);
    expect(draftCost(draft)).toEqual({ totalVnd: 57000, perServingVnd: 14250 });
  });

  it('leaves out rows that have no name because they are not saved', () => {
    const draft = draftWith(2, [{ name: 'Cá', costVnd: 20000 }, { name: '  ', costVnd: 99000 }]);
    expect(draftCost(draft).totalVnd).toBe(20000);
  });

  it('rounds the cost per serving to whole đồng', () => {
    const draft = draftWith(3, [{ name: 'Cá', costVnd: 10000 }]);
    expect(draftCost(draft).perServingVnd).toBe(3333);
  });

  it('follows the servings', () => {
    const rows = [{ name: 'Cá', costVnd: 60000 }];
    expect(draftCost(draftWith(2, rows)).perServingVnd).toBe(30000);
    expect(draftCost(draftWith(6, rows)).perServingVnd).toBe(10000);
  });
});
