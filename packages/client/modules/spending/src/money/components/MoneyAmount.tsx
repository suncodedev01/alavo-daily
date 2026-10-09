import { formatSignedVnd, formatVnd } from '@alavo-daily/common/format';
import { cn } from '@alavo-daily/design-system';

export interface MoneyAmountProps {
  amountVnd: number;
  signed?: boolean;
  className?: string;
}

export function MoneyAmount({ amountVnd, signed = true, className }: MoneyAmountProps) {
  const text = signed ? formatSignedVnd(amountVnd) : formatVnd(amountVnd);
  return <span className={cn('whitespace-nowrap', amountVnd > 0 && 'text-income-fg', className)}>{text}</span>;
}
