const VISIBLE_DIGITS = 4;

export function maskedAccountNumber(number: string | null | undefined): string | null {
  const digits = (number ?? '').replace(/\s+/g, '');
  if (digits === '') return null;
  return `•••• ${digits.slice(-VISIBLE_DIGITS)}`;
}
