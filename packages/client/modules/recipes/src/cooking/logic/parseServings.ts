import { MAX_SERVINGS, MIN_SERVINGS } from '../../vocabulary';

export function parseServings(param: string | null, fallback: number): number {
  const value = Number.parseInt(param ?? '', 10);
  if (Number.isNaN(value)) return fallback;
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, value));
}
