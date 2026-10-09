import type { Language } from '@alavo-daily/common';
import { formatMinutes } from '@alavo-daily/common/format';

import type { Costed, Timed } from '../types';

export function costForServings(recipe: Costed, servings: number): number {
  if (recipe.servings <= 0) return recipe.costVnd;
  return Math.round((recipe.costVnd * servings) / recipe.servings);
}

export function totalMinutes(recipe: Timed): number {
  return recipe.prepMin + recipe.cookMin;
}

export function totalTimeText(recipe: Timed, language: Language = 'vi'): string {
  return formatMinutes(totalMinutes(recipe), language);
}

export function knownTimeText(recipe: Timed, language: Language = 'vi'): string | null {
  return totalMinutes(recipe) > 0 ? totalTimeText(recipe, language) : null;
}

export function sharePercent(part: number, whole: number): number {
  return whole <= 0 ? 0 : Math.round((part / whole) * 100);
}
