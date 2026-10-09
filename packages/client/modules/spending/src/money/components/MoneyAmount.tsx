import { formatSignedVnd, formatVnd } from '@alavo-daily/common/format';
import { cn } from '@alavo-daily/design-system';

export interface MoneyAmountProps {
  amountVnd: number;
  signed?: boolean;
  className?: string;
}

export function MoneyAmount({ amountVnd, signed = true, className }: MoneyAmountProps) {
  const text = signed ? formatSignedVnd(amountVnd) : formatVnd(amountVnd);
  const tone = amountVnd > 0 ? 'text-income-fg' : amountVnd < 0 ? 'text-expense-fg' : undefined;
  return <span className={cn('whitespace-nowrap', tone, className)}>{text}</span>;
}
