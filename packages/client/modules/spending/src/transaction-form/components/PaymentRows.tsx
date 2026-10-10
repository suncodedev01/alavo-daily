import { useState } from 'react';

import { useT } from '@alavo-daily/common';

import type { Lookups } from '../../lookups';
import { PaymentMethodsDialog } from '../../payment-methods';
import { WalletsDialog } from '../../wallets';
import type { DraftErrors, TransactionDraft } from '../types';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { WalletPicker } from './WalletPicker';

export interface PaymentRowsProps {
  draft: TransactionDraft;
  lookups: Lookups;
  errors: DraftErrors;
  patch: (changes: Partial<TransactionDraft>) => void;
}

export function PaymentRows({ draft, lookups, errors, patch }: PaymentRowsProps) {
  const t = useT();
  const [managing, setManaging] = useState<'wallets' | 'methods' | null>(null);
  return (
    <>
      <WalletPicker
        wallets={lookups.wallets}
        selectedId={draft.walletId}
        onSelect={(walletId) => patch({ walletId })}
        label={draft.kind === 'income' ? t('Nhận vào ví') : t('Chi từ ví')}
        onManage={() => setManaging('wallets')}
        error={errors.wallet}
      />
      <PaymentMethodPicker
        methods={lookups.paymentMethods}
        selectedId={draft.paymentMethodId}
        onSelect={(paymentMethodId) => patch({ paymentMethodId })}
        onManage={() => setManaging('methods')}
      />
      <WalletsDialog open={managing === 'wallets'} onOpenChange={(open) => !open && setManaging(null)} />
      <PaymentMethodsDialog open={managing === 'methods'} onOpenChange={(open) => !open && setManaging(null)} />
    </>
  );
}
