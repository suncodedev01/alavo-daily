import type { EstimateItem } from '@alavo-daily/common/engine';
import { describe, expect, it } from 'vitest';

import { groupChoices, groupItems, paidState } from './groupItems';

function item(id: string, group: string): EstimateItem {
  return { id, group, name: id, price: 1, quantity: 1, priority: 'must', by: [], paid: 0 };
}

describe('groupItems', () => {
  it('keeps the order groups first appear in and the order of items inside each', () => {
    const groups = groupItems([item('a', 'Tiệc'), item('b', 'Ảnh'), item('c', 'Tiệc')]);
    expect(groups.map((group) => [group.name, group.items.map((entry) => entry.id)])).toEqual([
      ['Tiệc', ['a', 'c']],
      ['Ảnh', ['b']],
    ]);
  });

  it('returns nothing for no items', () => {
    expect(groupItems([])).toEqual([]);
  });
});

describe('groupChoices', () => {
  it('lists the groups in use first, then the suggested ones, without repeats', () => {
    expect(groupChoices([item('a', 'Ảnh')], ['Tiệc', 'Ảnh'])).toEqual(['Ảnh', 'Tiệc']);
  });
});

describe('paidState', () => {
  it('tells not paid, a deposit and paid in full apart', () => {
    expect(paidState(100, 0)).toBe('none');
    expect(paidState(100, 40)).toBe('part');
    expect(paidState(100, 100)).toBe('full');
  });

  it('counts a free item with nothing paid as not paid', () => {
    expect(paidState(0, 0)).toBe('none');
  });
});
