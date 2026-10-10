import { useEngineMutation, useEngineQuery, type Wallet } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';

import { DeleteWithTransactionsDialog, type MoveTarget } from '../../form-dialogs';
import { formatBalance } from '../../money';
import { walletIcon } from '../logic/walletKinds';

export interface WalletDeleteDialogProps {
  wallet: Wallet;
  otherWallets: readonly Wallet[];
  onClose: () => void;
}

export function WalletDeleteDialog({ wallet, otherWallets, onClose }: WalletDeleteDialogProps) {
  const t = useT();
  const used = useEngineQuery('spending.list_transactions', { walletId: wallet.id, limit: 1 });
  const remove = useEngineMutation('spending.delete_wallet');
  const targets: MoveTarget[] = otherWallets.map((other) => ({
    id: other.id,
    label: t(other.name),
    hint: formatBalance(other.balanceVnd),
    icon: walletIcon(other.kind),
  }));
  return (
    <DeleteWithTransactionsDialog
      title={t('Xoá ví {{name}}?', { name: wallet.name })}
      description={t('Ví này đã có giao dịch. Bạn muốn làm gì với chúng?')}
      emptyDescription={t('Ví này chưa có giao dịch nào.')}
      ready={!used.isPending}
      hasTransactions={(used.data?.length ?? 0) > 0}
      targets={targets}
      moveLabel={t('Chuyển sang ví khác')}
      moveHint={t('Tổng tiền và báo cáo không đổi.')}
      targetLabel={t('Ví nhận giao dịch')}
      removeLabel={t('Xoá luôn các giao dịch')}
      removeHint={t('Tổng chi tiêu và báo cáo sẽ giảm tương ứng.')}
      onConfirm={(choice) => remove.mutateAsync({ id: wallet.id, ...choice })}
      onClose={onClose}
    />
  );
}
