import type { Wallet } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Icon, OptionPicker } from '@alavo-daily/design-system';

import { formatBalance } from '../../money';
import { walletIcon } from '../../wallets';
import { PickerHeading } from './PickerHeading';

export interface WalletPickerProps {
  wallets: readonly Wallet[];
  selectedId: string;
  onSelect: (walletId: string) => void;
  label?: string;
  onManage?: () => void;
  error?: string;
}

const MAX_PILLS = 4;

const PILL_CLASS =
  'focus-ring inline-flex min-h-11 max-w-full items-center gap-2 rounded-4xl bg-surface px-4 py-2 text-sm font-medium leading-tight text-text-secondary inset-ring inset-ring-line-hairline hover:bg-surface-tint aria-pressed:bg-accent aria-pressed:text-accent-fg aria-pressed:inset-ring-0 lg:min-h-9';

export function WalletPicker({ wallets, selectedId, onSelect, label, onManage, error }: WalletPickerProps) {
  const t = useT();
  const heading = label ?? t('Chi từ ví');
  const fitsAsPills = wallets.length > 0 && wallets.length <= MAX_PILLS;
  return (
    <div className="grid gap-2">
      <PickerHeading label={heading} manageLabel={t('Quản lý ví')} onManage={onManage} />
      {fitsAsPills ? (
        <WalletPills wallets={wallets} selectedId={selectedId} onSelect={onSelect} label={heading} />
      ) : (
        <OptionPicker
          label={heading}
          value={selectedId || null}
          options={wallets.map((wallet) => ({
            value: wallet.id,
            label: t(wallet.name),
            hint: formatBalance(wallet.balanceVnd),
            icon: walletIcon(wallet.kind),
          }))}
          placeholder={t('Chọn ví')}
          leadingIcon="wallet"
          onChange={onSelect}
        />
      )}
      {error ? (
        <p role="alert" className="text-sm text-destructive-fg">
          {t(error)}
        </p>
      ) : null}
    </div>
  );
}

type WalletPillsProps = Omit<WalletPickerProps, 'error' | 'label'> & { label: string };

function WalletPills({ wallets, selectedId, onSelect, label }: WalletPillsProps) {
  const t = useT();
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {wallets.map((wallet) => (
          <button
            key={wallet.id}
            type="button"
            aria-pressed={wallet.id === selectedId}
            className={PILL_CLASS}
            onClick={() => onSelect(wallet.id)}
          >
            <Icon name={walletIcon(wallet.kind)} size="lg" className="shrink-0" />
            <span className="min-w-0 break-words text-left">{t(wallet.name)}</span>
          </button>
        ))}
    </div>
  );
}
