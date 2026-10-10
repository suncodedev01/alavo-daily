import { useState } from 'react';

import { useEngineMutation, useEngineQuery, type Wallet } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, Icon, OptionPicker, ResponsiveDialog } from '@alavo-daily/design-system';

import { describeEngineError } from '../../engine-errors';
import { formatBalance } from '../../money';
import { walletIcon } from '../logic/walletKinds';

export interface WalletDeleteDialogProps {
  wallet: Wallet;
  otherWallets: readonly Wallet[];
  onClose: () => void;
}

type Choice = 'move' | 'remove';

const CHOICE_CLASS =
  'focus-ring flex w-full items-start gap-3 rounded-lg p-3 text-left text-sm inset-ring inset-ring-line-hairline hover:bg-surface-tint aria-pressed:bg-accent aria-pressed:text-accent-fg aria-pressed:inset-ring-0';

export function WalletDeleteDialog({ wallet, otherWallets, onClose }: WalletDeleteDialogProps) {
  const t = useT();
  const used = useEngineQuery('spending.list_transactions', { walletId: wallet.id, limit: 1 });
  const remove = useEngineMutation('spending.delete_wallet');
  const [choice, setChoice] = useState<Choice>(otherWallets.length > 0 ? 'move' : 'remove');
  const [targetId, setTargetId] = useState(otherWallets[0]?.id ?? '');
  const [failure, setFailure] = useState<string | null>(null);
  const hasTransactions = (used.data?.length ?? 0) > 0;
  const confirm = async () => {
    try {
      await remove.mutateAsync(deletePayload(wallet.id, hasTransactions, choice, targetId));
      onClose();
    } catch (error) {
      setFailure(describeEngineError(error, t));
    }
  };
  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t('Xoá ví {{name}}?', { name: wallet.name })}
      description={hasTransactions ? t('Ví này đã có giao dịch. Bạn muốn làm gì với chúng?') : t('Ví này chưa có giao dịch nào.')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('Huỷ')}
          </Button>
          <Button variant="destructive" disabled={used.isPending || remove.isPending} onClick={() => void confirm()}>
            {t('Xoá')}
          </Button>
        </>
      }
    >
      {hasTransactions ? (
        <TransactionChoices
          choice={choice}
          onChoice={setChoice}
          otherWallets={otherWallets}
          targetId={targetId}
          onTarget={setTargetId}
        />
      ) : null}
      {failure ? (
        <p role="alert" className="text-sm text-destructive-fg">
          {failure}
        </p>
      ) : null}
    </ResponsiveDialog>
  );
}

function deletePayload(id: string, hasTransactions: boolean, choice: Choice, targetId: string) {
  if (!hasTransactions) return { id };
  return choice === 'move' ? { id, moveTransactionsTo: targetId } : { id, deleteTransactions: true };
}

interface TransactionChoicesProps {
  choice: Choice;
  onChoice: (choice: Choice) => void;
  otherWallets: readonly Wallet[];
  targetId: string;
  onTarget: (walletId: string) => void;
}

function TransactionChoices({ choice, onChoice, otherWallets, targetId, onTarget }: TransactionChoicesProps) {
  const t = useT();
  const canMove = otherWallets.length > 0;
  return (
    <div className="grid gap-2">
      <button type="button" disabled={!canMove} aria-pressed={choice === 'move'} className={CHOICE_CLASS} onClick={() => onChoice('move')}>
        <Icon name="arrows-left-right" size="lg" />
        <span className="grid gap-1">
          <span className="font-medium">{t('Chuyển sang ví khác')}</span>
          <span className="text-text-muted">{t('Tổng tiền và báo cáo không đổi.')}</span>
        </span>
      </button>
      {choice === 'move' && canMove ? (
        <OptionPicker
          label={t('Ví nhận giao dịch')}
          value={targetId}
          options={otherWallets.map((other) => ({
            value: other.id,
            label: t(other.name),
            hint: formatBalance(other.balanceVnd),
            icon: walletIcon(other.kind),
          }))}
          onChange={onTarget}
        />
      ) : null}
      <button type="button" aria-pressed={choice === 'remove'} className={CHOICE_CLASS} onClick={() => onChoice('remove')}>
        <Icon name="trash" size="lg" />
        <span className="grid gap-1">
          <span className="font-medium">{t('Xoá luôn các giao dịch')}</span>
          <span className="text-text-muted">{t('Tổng chi tiêu và báo cáo sẽ giảm tương ứng.')}</span>
        </span>
      </button>
    </div>
  );
}
