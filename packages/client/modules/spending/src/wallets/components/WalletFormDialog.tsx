import { useEngineMutation, type Wallet, type WalletKind } from '@alavo-daily/common/engine';
import { formatVndInput, parseVndInput } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Eyebrow, Field, Segmented } from '@alavo-daily/design-system';
import { useState } from 'react';

import { describeEngineError } from '../../engine-errors';
import { FormDialog } from '../../form-dialogs';
import { MoneyField } from '../../money';
import { WALLET_KINDS } from '../logic/walletKinds';

export interface WalletFormDialogProps {
  editing: Wallet | 'new' | null;
  onClose: () => void;
}

export function WalletFormDialog({ editing, onClose }: WalletFormDialogProps) {
  if (editing === null) return null;
  return <WalletForm existing={editing === 'new' ? null : editing} onClose={onClose} />;
}

function WalletForm({ existing, onClose }: { existing: Wallet | null; onClose: () => void }) {
  const t = useT();
  const create = useEngineMutation('spending.create_wallet');
  const update = useEngineMutation('spending.update_wallet');
  const [name, setName] = useState(existing?.name ?? '');
  const [kind, setKind] = useState<WalletKind>(existing?.kind ?? 'bank');
  const [opening, setOpening] = useState(formatVndInput(String(existing?.openingBalanceVnd ?? '')));
  const [problem, setProblem] = useState<string | null>(null);

  const submit = () => {
    if (name.trim() === '') return setProblem(t('Nhập tên ví.'));
    const fields = { name: name.trim(), kind, openingBalanceVnd: parseVndInput(opening) };
    const callbacks = {
      onSuccess: onClose,
      onError: (error: unknown) => setProblem(describeEngineError(error, t)),
    };
    if (existing) update.mutate({ id: existing.id, ...fields }, callbacks);
    else create.mutate(fields, callbacks);
  };

  return (
    <FormDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={existing ? t('Sửa ví') : t('Thêm ví')}
      submitLabel={t('Lưu ví')}
      onSubmit={submit}
      pending={create.isPending || update.isPending}
      error={problem}
    >
      <Field
        autoFocus
        leadingIcon="wallet"
        aria-label={t('Tên ví')}
        placeholder={t('Tên ví (ví dụ: Techcombank)')}
        autoComplete="off"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <div className="grid gap-2">
        <Eyebrow>{t('Loại ví')}</Eyebrow>
        <Segmented
          label={t('Loại ví')}
          value={kind}
          onChange={(value) => setKind(WALLET_KINDS.find((entry) => entry.value === value)?.value ?? 'bank')}
          options={WALLET_KINDS.map((entry) => ({ value: entry.value, label: t(entry.label) }))}
        />
      </div>
      <div className="grid gap-2">
        <Eyebrow>{t('Số dư ban đầu')}</Eyebrow>
        <MoneyField value={opening} onValueChange={setOpening} label={t('Số dư ban đầu')} />
      </div>
    </FormDialog>
  );
}
