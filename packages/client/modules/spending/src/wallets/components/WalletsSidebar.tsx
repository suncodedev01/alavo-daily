import { useEngineQuery } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { IconTile, NavItem, SidebarGroup } from '@alavo-daily/design-system';
import { useState } from 'react';

import { formatBalance } from '../../money';
import { Loadable, SkeletonRows } from '../../query-state';
import { walletIcon } from '../logic/walletKinds';
import { WalletsDialog } from './WalletsDialog';

export function WalletsSidebar() {
  const t = useT();
  const wallets = useEngineQuery('spending.list_wallets');
  const [managing, setManaging] = useState(false);
  return (
    <SidebarGroup label={t('Ví')} className="max-compact:hidden">
      <Loadable query={wallets} skeleton={<SkeletonRows count={3} className="h-10 w-full" />}>
        {(items) => (
          <ul className="grid gap-0.5">
            {items.map((wallet) => (
              <li key={wallet.id} className="flex items-center gap-2.5 rounded-lg px-3 py-1.5">
                <IconTile icon={walletIcon(wallet.kind)} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{wallet.name}</span>
                  <span className="block text-xs text-text-muted">{formatBalance(wallet.balanceVnd)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Loadable>
      <NavItem icon="gear" label={t('Quản lý ví')} onClick={() => setManaging(true)} />
      <WalletsDialog open={managing} onOpenChange={setManaging} />
    </SidebarGroup>
  );
}
