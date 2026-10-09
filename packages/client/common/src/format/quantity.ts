const QUANTITY = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/** `0.5` → `0,5`, `1500` stays `1.500`. At most one decimal. */
export function formatQuantity(value: number): string {
  return QUANTITY.format(value);
}

/** `scaleQuantity(600, 4, 2)` → `300`: a recipe's amount for another number of servings. */
export function scaleQuantity(quantity: number, fromServings: number, toServings: number): number {
  return fromServings === 0 ? quantity : (quantity * toServings) / fromServings;
}

/** Amount with its unit, switching grams and millilitres to kg and litres from 1000. */
export function formatAmount(quantity: number, unit: string): string {
  if (unit === 'g' && quantity >= 1000) return `${formatQuantity(quantity / 1000)} kg`;
  if (unit === 'ml' && quantity >= 1000) return `${formatQuantity(quantity / 1000)} lít`;
  return `${formatQuantity(quantity)} ${unit}`;
}

/** `190` → `3 giờ 10 phút`, `45` → `45 phút`, `120` → `2 giờ`. */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} giờ` : `${hours} giờ ${rest} phút`;
}

/** `300` → `05:00`, a countdown clock. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
