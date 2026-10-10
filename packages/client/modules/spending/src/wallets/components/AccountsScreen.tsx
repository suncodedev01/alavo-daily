import { useState } from 'react';

import { useEngineQuery, type Wallet } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, Card, EmptyState, Eyebrow, IconButton, StickerTile } from '@alavo-daily/design-system';

import { formatBalance } from '../../money';
import { Loadable, SkeletonRows } from '../../query-state';
import { SpendingScreen } from '../../spending-screen';
import { walletIcon } from '../logic/walletKinds';
import { walletKindLine } from '../logic/walletSubtitle';
import { WalletDeleteDialog } from './WalletDeleteDialog';
import { WalletFormDialog } from './WalletFormDialog';

type Editing = Wallet | 'new' | null;

/** The "Tài khoản" screen: every wallet with its balance, and the way to add, edit or delete one. */
export function AccountsScreen() {
  const t = useT();
  const wallets = useEngineQuery('spending.list_wallets');
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Wallet | null>(null);
  const addButton = (
    <Button leadingIcon="plus" onClick={() => setEditing('new')}>
      {t('Thêm ví')}
    </Button>
  );
  return (
    <SpendingScreen title={t('Tài khoản')} primaryAction={addButton}>
      <Loadable query={wallets} skeleton={<SkeletonRows count={4} className="h-16 w-full" />}>
        {(items) => (
          <>
            <TotalCard wallets={items} />
            <WalletList wallets={items} onEdit={setEditing} onDelete={setDeleting} onAdd={() => setEditing('new')} />
            {deleting ? (
              <WalletDeleteDialog
                key={deleting.id}
                wallet={deleting}
                otherWallets={items.filter((other) => other.id !== deleting.id)}
                onClose={() => setDeleting(null)}
              />
            ) : null}
          </>
        )}
      </Loadable>
      <WalletFormDialog editing={editing} onClose={() => setEditing(null)} />
    </SpendingScreen>
  );
}

function TotalCard({ wallets }: { wallets: readonly Wallet[] }) {
  const t = useT();
  const total = wallets.reduce((sum, wallet) => sum + wallet.balanceVnd, 0);
  return (
    <Card aria-label={t('Tổng số dư')}>
      <Eyebrow>{t('Tổng số dư')}</Eyebrow>
      <p className="mt-2 text-display font-semibold whitespace-nowrap">{formatBalance(total)}</p>
      <p className="mt-1 text-sm text-text-muted">{t('Trên {{wallets}} ví và tài khoản', { wallets: wallets.length })}</p>
    </Card>
  );
}

interface WalletListProps {
  wallets: readonly Wallet[];
  onEdit: (wallet: Wallet) => void;
  onDelete: (wallet: Wallet) => void;
  onAdd: () => void;
}

function WalletList({ wallets, onEdit, onDelete, onAdd }: WalletListProps) {
  const t = useT();
  if (wallets.length === 0) {
    return (
      <EmptyState
        icon="wallet"
        title={t('Chưa có ví nào')}
        description={t('Thêm một ví để ghi giao dịch.')}
        action={<Button onClick={onAdd}>{t('Thêm ví')}</Button>}
      />
    );
  }
  return (
    <ul className="grid gap-2">
      {wallets.map((wallet) => (
        <li key={wallet.id}>
          <WalletCard wallet={wallet} onEdit={onEdit} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  );
}

interface WalletCardProps {
  wallet: Wallet;
  onEdit: (wallet: Wallet) => void;
  onDelete: (wallet: Wallet) => void;
}

function WalletCard({ wallet, onEdit, onDelete }: WalletCardProps) {
  const t = useT();
  return (
    <Card className="flex items-center gap-3">
      <StickerTile icon={walletIcon(wallet.kind)} kind="wallet" size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-row font-medium">{t(wallet.name)}</p>
        <p className="truncate text-sm text-text-muted">{walletKindLine(wallet, t)}</p>
      </div>
      <p className="shrink-0 text-row font-semibold">{formatBalance(wallet.balanceVnd)}</p>
      <IconButton icon="pencil-simple" label={t('Sửa ví {{name}}', { name: wallet.name })} size="sm" onClick={() => onEdit(wallet)} />
      <IconButton icon="trash" label={t('Xoá ví {{name}}', { name: wallet.name })} size="sm" onClick={() => onDelete(wallet)} />
    </Card>
  );
}
