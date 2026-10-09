const MIN_VISIBLE_SHARE = 0.01;

/** `0.456` → `46%`; a tiny share reads `<1%` instead of `0%`. */
export function shareText(share: number): string {
  if (share > 0 && share < MIN_VISIBLE_SHARE) return '<1%';
  return `${Math.round(share * 100)}%`;
}
