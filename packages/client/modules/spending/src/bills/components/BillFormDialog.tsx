import { useEngineMutation, type Bill } from '@alavo-daily/common/engine';
import { formatVndInput, parseVndInput } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Eyebrow, Field, Stepper, Switch } from '@alavo-daily/design-system';
import { useState } from 'react';

import { BILL_ICONS } from '../logic/billIcons';
import { describeEngineError } from '../../engine-errors';
import { FormDialog, IconGrid } from '../../form-dialogs';
import { MoneyField } from '../../money';

export interface BillFormDialogProps {
  editing: Bill | 'new' | null;
  onClose: () => void;
}

const DAY_MIN = 1;
const DAY_MAX = 31;
const DEFAULT_DAY = 1;

export function BillFormDialog({ editing, onClose }: BillFormDialogProps) {
  if (editing === null) return null;
  return <BillForm existing={editing === 'new' ? null : editing} onClose={onClose} />;
}

function BillForm({ existing, onClose }: { existing: Bill | null; onClose: () => void }) {
  const t = useT();
  const save = useEngineMutation('spending.save_bill');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [icon, setIcon] = useState<string>(existing?.icon ?? BILL_ICONS[0]);
  const [amount, setAmount] = useState(formatVndInput(String(existing?.amountVnd ?? '')));
  const [day, setDay] = useState(existing?.dayOfMonth ?? DEFAULT_DAY);
  const [active, setActive] = useState(existing?.active ?? true);
  const [problem, setProblem] = useState<string | null>(null);

  const submit = () => {
    const amountVnd = parseVndInput(amount);
    if (title.trim() === '') return setProblem(t('Nhập tên khoản định kỳ.'));
    if (amountVnd <= 0) return setProblem(t('Nhập số tiền lớn hơn 0.'));
    save.mutate(
      { id: existing?.id, title: title.trim(), icon, amountVnd, dayOfMonth: day, active },
      { onSuccess: onClose, onError: (error) => setProblem(describeEngineError(error, t)) },
    );
  };

  return (
    <FormDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={existing ? t('Sửa khoản định kỳ') : t('Thêm khoản định kỳ')}
      submitLabel={t('Lưu khoản định kỳ')}
      onSubmit={submit}
      pending={save.isPending}
      error={problem}
    >
      <Field
        autoFocus
        leadingIcon="receipt"
        aria-label={t('Tên khoản định kỳ')}
        placeholder={t('Tên khoản (ví dụ: Internet FPT)')}
        autoComplete="off"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <IconGrid icons={BILL_ICONS} value={icon} onChange={setIcon} label={t('Biểu tượng')} />
      <MoneyField value={amount} onValueChange={setAmount} label={t('Số tiền')} leadingIcon="coins" />
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>{t('Ngày trả trong tháng')}</Eyebrow>
        <Stepper
          label={t('Ngày trả trong tháng')}
          value={day}
          min={DAY_MIN}
          max={DAY_MAX}
          onChange={setDay}
          decrementLabel={t('Lùi một ngày')}
          incrementLabel={t('Tới một ngày')}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm">{t('Đang theo dõi khoản này')}</span>
        <Switch label={t('Đang theo dõi khoản này')} checked={active} onCheckedChange={setActive} />
      </div>
    </FormDialog>
  );
}
