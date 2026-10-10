import { useEngineQuery, type Wallet } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Card, CardHeader, CardTitle, StickerTile } from '@alavo-daily/design-system';
import { useId } from 'react';

import { formatBalance } from '../../money';
import { LinkButton } from '../../navigation';
import { Loadable, SkeletonRows } from '../../query-state';
import { walletIcon } from '../logic/walletKinds';
import { walletKindLine } from '../logic/walletSubtitle';

/** Every wallet with its balance, for the overview; "Quản lý" goes to the Tài khoản screen. */
export function WalletBalancesCard() {
  const t = useT();
  const titleId = useId();
  const wallets = useEngineQuery('spending.list_wallets');
  return (
    <Card aria-labelledby={titleId}>
      <CardHeader>
        <CardTitle id={titleId}>{t('Các khoản tiền')}</CardTitle>
        <LinkButton to="/spending/accounts" variant="ghost" size="sm">
          {t('Quản lý')}
        </LinkButton>
      </CardHeader>
      <Loadable query={wallets} skeleton={<SkeletonRows count={3} className="h-12 w-full" />}>
        {(items) => <BalanceRows wallets={items} />}
      </Loadable>
    </Card>
  );
}

function BalanceRows({ wallets }: { wallets: readonly Wallet[] }) {
  const t = useT();
  if (wallets.length === 0) return <p className="text-sm text-text-muted">{t('Chưa có ví nào')}</p>;
  return (
    <ul className="grid divide-y divide-line-hairline">
      {wallets.map((wallet) => (
        <li key={wallet.id} className="flex min-h-14 items-center gap-3 py-2">
          <StickerTile icon={walletIcon(wallet.kind)} kind="wallet" size="md" />
          <span className="grid min-w-0 flex-1">
            <b className="truncate text-row font-medium">{t(wallet.name)}</b>
            <small className="truncate text-sm text-text-muted">{walletKindLine(wallet, t)}</small>
          </span>
          <b className="shrink-0 text-row font-semibold">{formatBalance(wallet.balanceVnd)}</b>
        </li>
      ))}
    </ul>
  );
}
