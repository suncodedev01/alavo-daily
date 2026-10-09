import { useEngineMutation, useEngineQuery, type Wallet } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, EmptyState, IconButton, StickerTile, ResponsiveDialog } from '@alavo-daily/design-system';
import { useState } from 'react';

import { formatBalance } from '../../money';
import { DeleteConfirm } from '../../form-dialogs';
import { Loadable, SkeletonRows } from '../../query-state';
import { walletIcon, walletKindLabel } from '../logic/walletKinds';
import { WalletFormDialog } from './WalletFormDialog';

export interface WalletsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Editing = Wallet | 'new' | null;

export function WalletsDialog({ open, onOpenChange }: WalletsDialogProps) {
  const t = useT();
  const wallets = useEngineQuery('spending.list_wallets');
  const remove = useEngineMutation('spending.delete_wallet');
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Wallet | null>(null);
  return (
    <>
      <ResponsiveDialog
        open={open && editing === null}
        onOpenChange={onOpenChange}
        title={t('Quản lý ví')}
        description={t('Ví là nơi tiền của bạn đang nằm: tài khoản ngân hàng, ví điện tử hoặc tiền mặt.')}
        footer={
          <Button leadingIcon="plus" onClick={() => setEditing('new')}>
            {t('Thêm ví')}
          </Button>
        }
      >
        <Loadable query={wallets} skeleton={<SkeletonRows count={3} />}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState icon="wallet" title={t('Chưa có ví nào')} description={t('Thêm một ví để ghi giao dịch.')} />
            ) : (
              <ul className="grid gap-1">
                {items.map((wallet) => (
                  <WalletRow key={wallet.id} wallet={wallet} onEdit={setEditing} onDelete={setDeleting} />
                ))}
              </ul>
            )
          }
        </Loadable>
      </ResponsiveDialog>
      <WalletFormDialog editing={editing} onClose={() => setEditing(null)} />
      <DeleteConfirm
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
        title={t('Xoá ví {{name}}?', { name: deleting?.name ?? '' })}
        description={t('Chỉ xoá được ví chưa có giao dịch nào.')}
        failureTitle={t('Không xoá được ví')}
        onDelete={() => remove.mutateAsync({ id: deleting?.id ?? '' })}
      />
    </>
  );
}

interface WalletRowProps {
  wallet: Wallet;
  onEdit: (wallet: Wallet) => void;
  onDelete: (wallet: Wallet) => void;
}

function WalletRow({ wallet, onEdit, onDelete }: WalletRowProps) {
  const t = useT();
  return (
    <li className="flex items-center gap-3 py-2">
      <StickerTile icon={walletIcon(wallet.kind)} kind="wallet" size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{wallet.name}</p>
        <p className="text-xs text-text-muted">{`${t(walletKindLabel(wallet.kind))} · ${formatBalance(wallet.balanceVnd)}`}</p>
      </div>
      <IconButton icon="pencil-simple" label={t('Sửa ví {{name}}', { name: wallet.name })} size="sm" onClick={() => onEdit(wallet)} />
      <IconButton icon="trash" label={t('Xoá ví {{name}}', { name: wallet.name })} size="sm" onClick={() => onDelete(wallet)} />
    </li>
  );
}
