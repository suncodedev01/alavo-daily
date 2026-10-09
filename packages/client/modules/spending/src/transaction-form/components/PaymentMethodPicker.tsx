import type { Wallet } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Eyebrow, Icon, OptionPicker } from '@alavo-daily/design-system';

import { formatBalance } from '../../money';
import { walletIcon } from '../../wallets';

export interface PaymentMethodPickerProps {
  wallets: readonly Wallet[];
  selectedId: string;
  onSelect: (walletId: string) => void;
  error?: string;
}

const MAX_PILLS = 4;

const PILL_CLASS =
  'focus-ring inline-flex min-h-11 max-w-full items-center gap-2 rounded-4xl bg-surface px-4 py-2 text-sm font-medium leading-tight text-text-secondary inset-ring inset-ring-line-hairline hover:bg-surface-tint aria-pressed:bg-accent aria-pressed:text-accent-fg aria-pressed:inset-ring-0 lg:min-h-9';

export function PaymentMethodPicker({ wallets, selectedId, onSelect, error }: PaymentMethodPickerProps) {
  const t = useT();
  const fitsAsPills = wallets.length > 0 && wallets.length <= MAX_PILLS;
  return (
    <div className="grid gap-2">
      {fitsAsPills ? (
        <PaymentPills wallets={wallets} selectedId={selectedId} onSelect={onSelect} />
      ) : (
        <OptionPicker
          label={t('Thanh toán bằng')}
          value={selectedId || null}
          options={wallets.map((wallet) => ({
            value: wallet.id,
            label: t(wallet.name),
            hint: formatBalance(wallet.balanceVnd),
            icon: walletIcon(wallet.kind),
          }))}
          placeholder={t('Chọn hình thức thanh toán')}
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

type PaymentPillsProps = Omit<PaymentMethodPickerProps, 'error'>;

function PaymentPills({ wallets, selectedId, onSelect }: PaymentPillsProps) {
  const t = useT();
  return (
    <div className="grid gap-2">
      <Eyebrow as="p">{t('Thanh toán bằng')}</Eyebrow>
      <div role="group" aria-label={t('Thanh toán bằng')} className="flex flex-wrap gap-2">
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
    </div>
  );
}
