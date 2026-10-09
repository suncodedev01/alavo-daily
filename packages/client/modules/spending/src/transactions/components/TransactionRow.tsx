import type { Transaction } from '@alavo-daily/common/engine';
import { IconTile } from '@alavo-daily/design-system';
import { Link } from 'react-router';

import type { Lookups } from '../../lookups';
import { MoneyAmount } from '../../money';

export interface TransactionRowProps {
  transaction: Transaction;
  lookups: Lookups;
  to: string;
  active?: boolean;
}

const ROW_CLASS =
  'focus-ring flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface-tint data-active:bg-accent';

export function TransactionRow({ transaction, lookups, to, active = false }: TransactionRowProps) {
  const subtitle = [lookups.categoryName(transaction.categoryId), lookups.walletName(transaction.walletId)]
    .filter((part) => part !== '')
    .join(' · ');
  return (
    <Link to={to} aria-current={active ? 'true' : undefined} data-active={active ? '' : undefined} className={ROW_CLASS}>
      <IconTile icon={lookups.categoryIcon(transaction.categoryId)} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-text-primary">{transaction.title}</span>
        <span className="block truncate text-xs text-text-muted">{subtitle}</span>
      </span>
      <MoneyAmount amountVnd={transaction.amountVnd} className="text-sm font-medium" />
    </Link>
  );
}
