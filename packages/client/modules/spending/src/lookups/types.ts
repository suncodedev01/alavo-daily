import type { Category, Wallet } from '@alavo-daily/common/engine';

export interface Lookups {
  isPending: boolean;
  isError: boolean;
  categories: Category[];
  wallets: Wallet[];
  category: (id: string) => Category | undefined;
  categoryName: (id: string) => string;
  categoryIcon: (id: string) => string;
  walletName: (id: string) => string;
}
