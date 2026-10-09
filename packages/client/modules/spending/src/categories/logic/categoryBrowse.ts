import type { Category } from '@alavo-daily/common/engine';
import { foldText } from '@alavo-daily/common/format';

export const VISIBLE_CATEGORY_COUNT = 6;

export function visibleCategories(
  categories: readonly Category[],
  selectedId: string,
  limit = VISIBLE_CATEGORY_COUNT,
): readonly Category[] {
  const firstFew = categories.slice(0, limit);
  if (firstFew.some((category) => category.id === selectedId)) return firstFew;
  const selected = categories.find((category) => category.id === selectedId);
  return selected ? [...categories.slice(0, limit - 1), selected] : firstFew;
}

export function filterCategories(
  categories: readonly Category[],
  query: string,
  translate: (name: string) => string,
): readonly Category[] {
  const needle = foldText(query);
  if (!needle) return categories;
  return categories.filter((category) => foldText(translate(category.name)).includes(needle));
}
