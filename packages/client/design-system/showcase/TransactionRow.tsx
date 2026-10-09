import { IconTile } from '@/index';
import { formatSigned, type Transaction } from './sampleData';

export function TransactionRow({ transaction, selected = false }: { transaction: Transaction; selected?: boolean }) {
  const income = transaction.amount > 0;
  return (
    <button
      type="button"
      aria-current={selected ? 'true' : undefined}
      className={`focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface-tint max-lg:min-h-15 max-lg:px-0 ${selected ? 'bg-accent hover:bg-accent' : ''}`}
    >
      <IconTile icon={transaction.icon} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium max-lg:text-base">{transaction.title}</span>
        <span className={`block truncate text-xs ${selected ? 'text-text-secondary' : 'text-text-muted'}`}>
          {transaction.category} · {transaction.wallet}
        </span>
      </span>
      <span className={`text-sm font-medium whitespace-nowrap max-lg:text-base ${income ? 'text-income-fg' : ''}`}>
        {formatSigned(transaction.amount)}
      </span>
    </button>
  );
}
