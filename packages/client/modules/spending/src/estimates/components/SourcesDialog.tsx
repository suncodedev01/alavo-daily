import { useEngineMutation, useEngineQuery, type Estimate } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, Checkbox, ResponsiveDialog, StickerTile } from '@alavo-daily/design-system';

import { formatBalance } from '../../money';
import { Loadable, SkeletonRows } from '../../query-state';
import { walletIcon } from '../../wallets';

export interface SourcesDialogProps {
  estimate: Estimate;
  onClose: () => void;
}

/** Which wallets count as money on hand for this estimate, so one wallet can be kept aside for it. */
export function SourcesDialog({ estimate, onClose }: SourcesDialogProps) {
  const t = useT();
  const wallets = useEngineQuery('spending.list_wallets');
  const update = useEngineMutation('spending.update_estimate');
  const toggle = (walletId: string, on: boolean) => {
    const others = estimate.walletIds.filter((id) => id !== walletId);
    update.mutate({ id: estimate.id, walletIds: on ? [...others, walletId] : others });
  };
  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t('Tiền đang có')}
      description={t('Chọn các ví tính là tiền đang có cho dự toán này. Bạn có thể để riêng một ví cho việc này.')}
      footer={<Button onClick={onClose}>{t('Đóng')}</Button>}
    >
      <Loadable query={wallets} skeleton={<SkeletonRows count={3} />}>
        {(items) => (
          <ul className="grid gap-1">
            {items.map((wallet) => (
              <li key={wallet.id} className="flex items-center gap-3 py-2">
                <StickerTile icon={walletIcon(wallet.kind)} kind="wallet" size="md" />
                <span className="grid min-w-0 flex-1">
                  <span className="truncate text-sm font-medium">{t(wallet.name)}</span>
                  <span className="text-sm text-text-muted">{formatBalance(wallet.balanceVnd)}</span>
                </span>
                <Checkbox
                  label={t('Tính ví {{name}}', { name: wallet.name })}
                  checked={estimate.walletIds.includes(wallet.id)}
                  onCheckedChange={(on) => toggle(wallet.id, on)}
                />
              </li>
            ))}
          </ul>
        )}
      </Loadable>
    </ResponsiveDialog>
  );
}
