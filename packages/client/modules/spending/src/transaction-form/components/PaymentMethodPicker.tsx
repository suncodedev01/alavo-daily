import type { PaymentMethod } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Icon } from '@alavo-daily/design-system';

import { PickerHeading } from './PickerHeading';

export interface PaymentMethodPickerProps {
  methods: readonly PaymentMethod[];
  selectedId: string;
  onSelect: (methodId: string) => void;
  onManage?: () => void;
}

const PILL_CLASS =
  'focus-ring inline-flex min-h-11 max-w-full items-center gap-2 rounded-4xl bg-surface px-4 py-2 text-sm font-medium leading-tight text-text-secondary inset-ring inset-ring-line-hairline hover:bg-surface-tint aria-pressed:bg-accent aria-pressed:text-accent-fg aria-pressed:inset-ring-0 lg:min-h-9';

export function PaymentMethodPicker({ methods, selectedId, onSelect, onManage }: PaymentMethodPickerProps) {
  const t = useT();
  const label = t('Thanh toán bằng');
  return (
    <div className="grid gap-2">
      <PickerHeading label={label} manageLabel={t('Quản lý')} onManage={onManage} />
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {methods.map((method) => (
          <button
            key={method.id}
            type="button"
            aria-pressed={method.id === selectedId}
            className={PILL_CLASS}
            onClick={() => onSelect(method.id)}
          >
            <Icon name={method.icon} size="lg" className="shrink-0" />
            <span className="min-w-0 break-words text-left">{t(method.name)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
