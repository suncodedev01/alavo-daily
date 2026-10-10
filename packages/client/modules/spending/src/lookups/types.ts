import type { Category, PaymentMethod, Wallet } from '@alavo-daily/common/engine';

export interface Lookups {
  isPending: boolean;
  isError: boolean;
  categories: Category[];
  wallets: Wallet[];
  paymentMethods: PaymentMethod[];
  category: (id: string) => Category | undefined;
  categoryName: (id: string) => string;
  categoryIcon: (id: string) => string;
  walletName: (id: string) => string;
  paymentMethodName: (id: string | null | undefined) => string;
}
