import { formatSignedVnd, formatVnd } from '@alavo-daily/common/format';

export function formatBalance(amountVnd: number): string {
  return amountVnd < 0 ? formatSignedVnd(amountVnd) : formatVnd(amountVnd);
}
