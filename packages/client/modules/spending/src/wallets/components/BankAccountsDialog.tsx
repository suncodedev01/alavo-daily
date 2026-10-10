import { useEngineQuery, type Wallet } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, EmptyState, ResponsiveDialog, StickerTile, useToast } from '@alavo-daily/design-system';

import { Loadable, SkeletonRows } from '../../query-state';
import { walletIcon } from '../logic/walletKinds';

export interface BankAccountsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function withAccountNumber(wallets: readonly Wallet[]): Wallet[] {
  return wallets.filter((wallet) => Boolean(wallet.accountNumber));
}

/** Account numbers of the bank wallets, to look up and copy. They are never used to reach a bank. */
export function BankAccountsDialog({ open, onOpenChange }: BankAccountsDialogProps) {
  const t = useT();
  const wallets = useEngineQuery('spending.list_wallets');
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('Số tài khoản ngân hàng')}
      description={t('Số tài khoản bạn đã ghi cho từng ví. Chỉ để tra cứu và sao chép.')}
      footer={<Button onClick={() => onOpenChange(false)}>{t('Đóng')}</Button>}
    >
      <Loadable query={wallets} skeleton={<SkeletonRows count={2} />}>
        {(items) => {
          const accounts = withAccountNumber(items);
          return accounts.length === 0 ? (
            <EmptyState
              icon="bank"
              title={t('Chưa có số tài khoản nào')}
              description={t('Ghi số tài khoản khi thêm hoặc sửa một ví loại ngân hàng.')}
            />
          ) : (
            <ul className="grid gap-1">
              {accounts.map((wallet) => (
                <AccountRow key={wallet.id} wallet={wallet} />
              ))}
            </ul>
          );
        }}
      </Loadable>
    </ResponsiveDialog>
  );
}

function AccountRow({ wallet }: { wallet: Wallet }) {
  const t = useT();
  const { toast } = useToast();
  const copy = () => {
    const write = navigator.clipboard?.writeText(wallet.accountNumber ?? '');
    void Promise.resolve(write).then(
      () => toast(t('Đã sao chép số tài khoản')),
      () => toast(t('Không sao chép được. Bạn thử lại nhé.')),
    );
  };
  return (
    <li className="flex items-center gap-3 py-2">
      <StickerTile icon={walletIcon(wallet.kind)} kind="wallet" size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{t(wallet.name)}</p>
        <p className="text-sm text-text-muted">{wallet.accountNumber}</p>
      </div>
      <Button variant="outline" size="sm" leadingIcon="copy" aria-label={t('Sao chép số tài khoản {{name}}', { name: wallet.name })} onClick={copy}>
        {t('Sao chép')}
      </Button>
    </li>
  );
}
