import type { WalletKind } from '@alavo-daily/common/engine';

export const WALLET_KINDS: { value: WalletKind; label: string; icon: string }[] = [
  { value: 'bank', label: 'Ngân hàng', icon: 'bank' },
  { value: 'ewallet', label: 'Ví điện tử', icon: 'device-mobile' },
  { value: 'cash', label: 'Tiền mặt', icon: 'coins' },
];

export function walletIcon(kind: WalletKind): string {
  return WALLET_KINDS.find((entry) => entry.value === kind)?.icon ?? 'wallet';
}

export function walletKindLabel(kind: WalletKind): string {
  return WALLET_KINDS.find((entry) => entry.value === kind)?.label ?? '';
}
