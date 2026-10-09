import type { Aisle, ShoppingItem } from '@alavo-daily/common/engine';

import { AISLES } from '../../vocabulary';
import type { AisleGroup } from '../types';

export function groupByAisle(items: readonly ShoppingItem[]): AisleGroup[] {
  return AISLES.map((aisle) => {
    const own = items.filter((item) => item.aisle === aisle);
    return {
      aisle,
      items: [...own].sort((a, b) => Number(a.have) - Number(b.have)),
      neededCount: own.filter((item) => !item.have).length,
    };
  }).filter((group) => group.items.length > 0);
}

export function sourceRecipeNames(items: readonly ShoppingItem[]): string[] {
  return Array.from(new Set(items.flatMap((item) => item.from)));
}
