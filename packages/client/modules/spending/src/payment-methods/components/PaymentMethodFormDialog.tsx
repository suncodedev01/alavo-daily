import { useState } from 'react';

import { useEngineMutation, type PaymentIcon, type PaymentMethod } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Eyebrow, Field, Icon } from '@alavo-daily/design-system';

import { describeEngineError } from '../../engine-errors';
import { FormDialog } from '../../form-dialogs';
import { DEFAULT_PAYMENT_ICON, PAYMENT_ICON_CHOICES } from '../logic/paymentIcons';

export interface PaymentMethodFormDialogProps {
  editing: PaymentMethod | 'new' | null;
  onClose: () => void;
}

const ICON_CLASS =
  'focus-ring grid min-h-16 place-items-center gap-1 rounded-lg p-2 text-xs text-text-secondary hover:bg-surface-tint aria-pressed:bg-accent aria-pressed:text-accent-fg';

export function PaymentMethodFormDialog({ editing, onClose }: PaymentMethodFormDialogProps) {
  if (editing === null) return null;
  return <PaymentMethodForm existing={editing === 'new' ? null : editing} onClose={onClose} />;
}

function PaymentMethodForm({ existing, onClose }: { existing: PaymentMethod | null; onClose: () => void }) {
  const t = useT();
  const create = useEngineMutation('spending.create_payment_method');
  const update = useEngineMutation('spending.update_payment_method');
  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState<PaymentIcon>(existing?.icon ?? DEFAULT_PAYMENT_ICON);
  const [problem, setProblem] = useState<string | null>(null);

  const submit = () => {
    if (name.trim() === '') return setProblem(t('Nhập tên hình thức.'));
    const callbacks = {
      onSuccess: onClose,
      onError: (error: unknown) => setProblem(describeEngineError(error, t)),
    };
    const fields = { name: name.trim(), icon };
    if (existing) update.mutate({ id: existing.id, ...fields }, callbacks);
    else create.mutate(fields, callbacks);
  };

  return (
    <FormDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={existing ? t('Sửa hình thức thanh toán') : t('Thêm hình thức thanh toán')}
      submitLabel={t('Lưu hình thức')}
      onSubmit={submit}
      pending={create.isPending || update.isPending}
      error={problem}
    >
      <Field
        autoFocus
        leadingIcon="credit-card"
        aria-label={t('Tên hình thức')}
        placeholder={t('Tên hình thức (ví dụ: Thẻ Visa)')}
        autoComplete="off"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <div className="grid gap-2">
        <Eyebrow>{t('Biểu tượng')}</Eyebrow>
        <div role="group" aria-label={t('Biểu tượng')} className="grid grid-cols-5 gap-2">
          {PAYMENT_ICON_CHOICES.map((choice) => (
            <button
              key={choice.icon}
              type="button"
              aria-pressed={choice.icon === icon}
              aria-label={t(choice.label)}
              className={ICON_CLASS}
              onClick={() => setIcon(choice.icon)}
            >
              <Icon name={choice.icon} size="xl" />
              <span>{t(choice.label)}</span>
            </button>
          ))}
        </div>
      </div>
    </FormDialog>
  );
}
