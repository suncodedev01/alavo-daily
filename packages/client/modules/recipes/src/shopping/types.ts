import type { Aisle, ShoppingItem } from '@alavo-daily/common/engine';

export interface AisleGroup {
  aisle: Aisle;
  items: ShoppingItem[];
  neededCount: number;
}
