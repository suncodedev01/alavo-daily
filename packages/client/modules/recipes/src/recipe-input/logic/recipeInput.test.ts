import { describe, expect, it } from 'vitest';

import { GA_KHO } from '../../testing/fixtures';
import { recipeToInput } from './recipeInput';

describe('recipeToInput', () => {
  it('keeps the fields, ingredients and steps without ids', () => {
    const input = recipeToInput(GA_KHO);
    expect(input.name).toBe('Gà kho gừng');
    expect(input.ingredients[0]).toEqual({
      name: 'Đùi gà',
      quantity: 600,
      unit: 'g',
      aisle: 'meat_fish',
      costVnd: 54000,
    });
    expect(input.steps[0]).toEqual({ text: 'Rửa gà, chặt miếng vừa ăn rồi ướp.', timerMin: 15 });
  });

  it('applies the changes on top', () => {
    expect(recipeToInput(GA_KHO, { note: 'ít đường' }).note).toBe('ít đường');
  });
});
