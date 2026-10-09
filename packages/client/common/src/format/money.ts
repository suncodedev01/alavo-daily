const VND = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

/** `1250000` → `1.250.000 ₫`. The sign is dropped: use `formatSignedVnd` to keep it. */
export function formatVnd(amount: number): string {
  return `${VND.format(Math.abs(Math.round(amount)))} ₫`;
}

/** `-65000` → `−65.000 ₫`, `4500000` → `+4.500.000 ₫`, `0` → `0 ₫`. */
export function formatSignedVnd(amount: number): string {
  if (amount === 0) return formatVnd(0);
  return `${amount > 0 ? '+' : '−'}${formatVnd(amount)}`;
}

/** Digits only, as typed into a money field: `"1.250.000"` → `1250000`. */
export function parseVndInput(text: string): number {
  const digits = text.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
}

/** Live formatting for a money field: `"1250000"` → `"1.250.000"`, empty stays empty. */
export function formatVndInput(text: string): string {
  const digits = text.replace(/\D/g, '');
  return digits === '' ? '' : VND.format(Number(digits));
}

/** `0.923` → `92%`. */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
