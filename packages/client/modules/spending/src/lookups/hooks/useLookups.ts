import { useEngineQuery } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';

import type { Lookups } from '../types';

const UNKNOWN_ICON = 'tag';

export function useLookups(): Lookups {
  const t = useT();
  const categories = useEngineQuery('spending.list_categories');
  const wallets = useEngineQuery('spending.list_wallets');
  const methods = useEngineQuery('spending.list_payment_methods');
  const categoryList = categories.data ?? [];
  const walletList = wallets.data ?? [];
  const categoryMap = new Map(categoryList.map((item) => [item.id, item]));
  const walletMap = new Map(walletList.map((item) => [item.id, item]));
  const methodList = methods.data ?? [];
  const methodMap = new Map(methodList.map((item) => [item.id, item]));
  return {
    isPending: categories.isPending || wallets.isPending || methods.isPending,
    isError: categories.isError || wallets.isError || methods.isError,
    categories: categoryList,
    wallets: walletList,
    paymentMethods: methodList,
    category: (id) => categoryMap.get(id),
    categoryName: (id) => t(categoryMap.get(id)?.name ?? ''),
    categoryIcon: (id) => categoryMap.get(id)?.icon ?? UNKNOWN_ICON,
    walletName: (id) => t(walletMap.get(id)?.name ?? ''),
    paymentMethodName: (id) => t(methodMap.get(id ?? '')?.name ?? ''),
  };
}
