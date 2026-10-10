import type { Wallet } from '@alavo-daily/common/engine';

import { formatBalance } from '../../money';
import { maskedAccountNumber } from './accountNumber';
import { walletKindLabel } from './walletKinds';

type Translate = (key: string) => string;

export function walletSubtitle(wallet: Wallet, t: Translate): string {
  const parts = [t(walletKindLabel(wallet.kind)), maskedAccountNumber(wallet.accountNumber), formatBalance(wallet.balanceVnd)];
  return parts.filter((part): part is string => Boolean(part)).join(' · ');
}
