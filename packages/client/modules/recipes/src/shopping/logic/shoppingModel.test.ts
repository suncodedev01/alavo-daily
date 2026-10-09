import type { ShoppingItem } from '@alavo-daily/common/engine';
import { describe, expect, it } from 'vitest';

import { groupByAisle, sourceRecipeNames } from './shoppingModel';

function item(name: string, overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    key: `${name}|g`,
    name,
    unit: 'g',
    aisle: 'other',
    quantity: 1,
    costVnd: 0,
    from: [],
    have: false,
    custom: false,
    ...overrides,
  };
}

describe('groupByAisle', () => {
  it('orders the groups meat, vegetables, spices, other and skips empty ones', () => {
    const groups = groupByAisle([
      item('Muối', { aisle: 'spices' }),
      item('Cá', { aisle: 'meat_fish' }),
      item('Sữa'),
    ]);
    expect(groups.map((group) => group.aisle)).toEqual(['meat_fish', 'spices', 'other']);
  });

  it('puts what is still needed above what is already at home', () => {
    const [group] = groupByAisle([
      item('Tỏi', { aisle: 'vegetables', have: true }),
      item('Cà', { aisle: 'vegetables' }),
    ]);
    expect(group?.items.map((own) => own.name)).toEqual(['Cà', 'Tỏi']);
    expect(group?.neededCount).toBe(1);
  });
});

describe('sourceRecipeNames', () => {
  it('lists each recipe once', () => {
    const names = sourceRecipeNames([
      item('Cà', { from: ['Canh chua', 'Gà kho'] }),
      item('Tỏi', { from: ['Gà kho'] }),
      item('Sữa'),
    ]);
    expect(names).toEqual(['Canh chua', 'Gà kho']);
  });
});
