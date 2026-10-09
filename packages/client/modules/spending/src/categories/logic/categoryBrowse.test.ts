import { describe, expect, it } from 'vitest';

import type { Category } from '@alavo-daily/common/engine';

import { filterCategories, visibleCategories } from './categoryBrowse';

function category(id: string, name: string): Category {
  return { id, name, icon: 'tag' } as Category;
}

const ALL = ['Ăn uống', 'Đi lại', 'Mua sắm', 'Giải trí', 'Sức khoẻ', 'Nhà cửa', 'Thú cưng', 'Quà tặng'].map(
  (name, index) => category(`c${index}`, name),
);
const same = (name: string) => name;

describe('visibleCategories', () => {
  it('shows the first six when the selected one is among them', () => {
    expect(visibleCategories(ALL, 'c2').map((c) => c.id)).toEqual(['c0', 'c1', 'c2', 'c3', 'c4', 'c5']);
  });

  it('keeps a selected category from the hidden rest in view by replacing the sixth', () => {
    expect(visibleCategories(ALL, 'c7').map((c) => c.id)).toEqual(['c0', 'c1', 'c2', 'c3', 'c4', 'c7']);
  });

  it('shows everything when there are fewer than six', () => {
    expect(visibleCategories(ALL.slice(0, 3), 'c1')).toHaveLength(3);
  });
});

describe('filterCategories', () => {
  it('matches without diacritics and without case', () => {
    expect(filterCategories(ALL, 'an uong', same).map((c) => c.name)).toEqual(['Ăn uống']);
    expect(filterCategories(ALL, 'DI LAI', same).map((c) => c.name)).toEqual(['Đi lại']);
  });

  it('returns every category for an empty search and none for a miss', () => {
    expect(filterCategories(ALL, '  ', same)).toHaveLength(ALL.length);
    expect(filterCategories(ALL, 'zzz', same)).toEqual([]);
  });
});
