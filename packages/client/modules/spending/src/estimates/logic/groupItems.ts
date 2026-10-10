import type { EstimateItem } from '@alavo-daily/common/engine';

export interface ItemGroup {
  name: string;
  items: EstimateItem[];
}

/** Items gathered by group, in the order each group first appears. */
export function groupItems(items: readonly EstimateItem[]): ItemGroup[] {
  const groups = new Map<string, EstimateItem[]>();
  for (const item of items) groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
  return [...groups.entries()].map(([name, grouped]) => ({ name, items: grouped }));
}

/** Group names the person can pick from when adding an item: the ones in use, then the template's. */
export function groupChoices(items: readonly EstimateItem[], suggested: readonly string[]): string[] {
  const names = [...items.map((item) => item.group), ...suggested];
  return [...new Set(names)];
}

export type PaidState = 'none' | 'part' | 'full';

export function paidState(amount: number, paid: number): PaidState {
  if (paid <= 0) return 'none';
  return paid >= amount ? 'full' : 'part';
}
