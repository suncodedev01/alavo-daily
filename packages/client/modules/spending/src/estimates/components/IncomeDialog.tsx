import { useState } from 'react';

import { useEngineMutation, type Estimate, type ExpectedIncome } from '@alavo-daily/common/engine';
import { formatVndInput, parseVndInput } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Button, EmptyState, Eyebrow, Field, IconButton, ResponsiveDialog } from '@alavo-daily/design-system';

import { describeEngineError } from '../../engine-errors';
import { FormDialog } from '../../form-dialogs';
import { MoneyField, formatBalance } from '../../money';

export interface IncomeDialogProps {
  estimate: Estimate;
  onClose: () => void;
}

type Editing = ExpectedIncome | 'new' | null;

/** Money the person expects to receive for this estimate, such as wedding gifts or a bonus. */
export function IncomeDialog({ estimate, onClose }: IncomeDialogProps) {
  const t = useT();
  const remove = useEngineMutation('spending.delete_estimate_income');
  const [editing, setEditing] = useState<Editing>(null);
  return (
    <>
      <ResponsiveDialog
        open={editing === null}
        onOpenChange={(open) => !open && onClose()}
        title={t('Khoản sẽ thu')}
        description={t('Tiền mừng, thưởng hay tiền gia đình hỗ trợ. Đây chỉ là dự kiến nên ứng dụng luôn cho bạn xem cả kết quả khi chưa tính khoản này.')}
        footer={
          <>
            <Button variant="outline" onClick={onClose}>
              {t('Đóng')}
            </Button>
            <Button leadingIcon="plus" onClick={() => setEditing('new')}>
              {t('Thêm khoản thu')}
            </Button>
          </>
        }
      >
        {estimate.income.length === 0 ? (
          <EmptyState icon="coins" title={t('Chưa có khoản thu dự kiến')} />
        ) : (
          <ul className="grid gap-1">
            {estimate.income.map((line) => (
              <li key={line.id} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-row font-medium">{line.label}</span>
                <span className="text-row font-semibold text-income-fg">{formatBalance(line.amount)}</span>
                <IconButton icon="pencil-simple" label={t('Sửa khoản thu {{name}}', { name: line.label })} size="sm" onClick={() => setEditing(line)} />
                <IconButton icon="trash" label={t('Xoá khoản thu {{name}}', { name: line.label })} size="sm" onClick={() => remove.mutate({ estimateId: estimate.id, id: line.id })} />
              </li>
            ))}
          </ul>
        )}
      </ResponsiveDialog>
      {editing === null ? null : (
        <IncomeForm estimateId={estimate.id} existing={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function IncomeForm({ estimateId, existing, onClose }: { estimateId: string; existing: ExpectedIncome | null; onClose: () => void }) {
  const t = useT();
  const save = useEngineMutation('spending.save_estimate_income');
  const [label, setLabel] = useState(existing?.label ?? '');
  const [amount, setAmount] = useState(formatVndInput(String(existing?.amount ?? '')));
  const [problem, setProblem] = useState<string | null>(null);
  const submit = () => {
    if (label.trim() === '') return setProblem(t('Nhập tên khoản thu.'));
    save.mutate(
      { estimateId, id: existing?.id, label: label.trim(), amount: parseVndInput(amount) },
      { onSuccess: onClose, onError: (error) => setProblem(describeEngineError(error, t)) },
    );
  };
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={existing ? t('Sửa khoản thu') : t('Thêm khoản thu')}
      submitLabel={t('Lưu khoản thu')}
      onSubmit={submit}
      pending={save.isPending}
      error={problem}
    >
      <Field autoFocus leadingIcon="coins" aria-label={t('Tên khoản thu')} placeholder={t('Tên khoản thu (ví dụ: Tiền mừng)')} autoComplete="off" value={label} onChange={(event) => setLabel(event.target.value)} />
      <div className="grid gap-2">
        <Eyebrow>{t('Số tiền dự kiến')}</Eyebrow>
        <MoneyField value={amount} onValueChange={setAmount} label={t('Số tiền dự kiến')} />
      </div>
    </FormDialog>
  );
}
