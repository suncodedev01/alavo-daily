import type { Wallet } from '@alavo-daily/common/engine';

import { formatBalance } from '../../money';
import { maskedAccountNumber } from './accountNumber';
import { walletKindLabel } from './walletKinds';

type Translate = (key: string) => string;

function joined(parts: (string | null)[]): string {
  return parts.filter((part): part is string => Boolean(part)).join(' · ');
}

/** The kind of wallet and, for a bank account, the last digits of its number. */
export function walletKindLine(wallet: Wallet, t: Translate): string {
  return joined([t(walletKindLabel(wallet.kind)), maskedAccountNumber(wallet.accountNumber)]);
}

export function walletSubtitle(wallet: Wallet, t: Translate): string {
  return joined([walletKindLine(wallet, t), formatBalance(wallet.balanceVnd)]);
}
