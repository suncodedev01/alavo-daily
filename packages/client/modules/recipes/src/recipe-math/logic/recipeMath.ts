import { formatMinutes } from '@alavo-daily/common/format';

import type { Costed, Timed } from '../types';

export function costForServings(recipe: Costed, servings: number): number {
  if (recipe.servings <= 0) return recipe.costVnd;
  return Math.round((recipe.costVnd * servings) / recipe.servings);
}

export function totalMinutes(recipe: Timed): number {
  return recipe.prepMin + recipe.cookMin;
}

export function totalTimeText(recipe: Timed): string {
  return formatMinutes(totalMinutes(recipe));
}

export function sharePercent(part: number, whole: number): number {
  return whole <= 0 ? 0 : Math.round((part / whole) * 100);
}
