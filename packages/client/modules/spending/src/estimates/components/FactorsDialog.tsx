import { useState } from 'react';

import { useEngineMutation, type Estimate, type EstimateFactor } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, Field, IconButton, ResponsiveDialog, Stepper } from '@alavo-daily/design-system';

export interface FactorsDialogProps {
  estimate: Estimate;
  onClose: () => void;
}

const MAX_FACTOR = 100_000;

/** The numbers amounts multiply by. Changing one recalculates every item that uses it. */
export function FactorsDialog({ estimate, onClose }: FactorsDialogProps) {
  const t = useT();
  const save = useEngineMutation('spending.save_estimate_factor');
  const remove = useEngineMutation('spending.delete_estimate_factor');
  const [label, setLabel] = useState('');
  const add = () => {
    if (label.trim() === '') return;
    save.mutate({ estimateId: estimate.id, label: label.trim(), value: 1 }, { onSuccess: () => setLabel('') });
  };
  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t('Các con số nhân')}
      description={t('Ví dụ số khách, số người, số ngày. Khoản nào chọn nhân theo con số nào thì tự tính lại khi bạn đổi.')}
      footer={<Button onClick={onClose}>{t('Đóng')}</Button>}
    >
      <ul className="grid gap-1">
        {estimate.factors.map((factor) => (
          <FactorRow
            key={factor.id}
            factor={factor}
            onChange={(value) => save.mutate({ estimateId: estimate.id, id: factor.id, label: factor.label, value })}
            onDelete={() => remove.mutate({ estimateId: estimate.id, id: factor.id })}
          />
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <Field
          aria-label={t('Tên con số mới')}
          placeholder={t('Tên con số (ví dụ: số phòng)')}
          autoComplete="off"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <Button variant="outline" leadingIcon="plus" onClick={add}>
          {t('Thêm')}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}

interface FactorRowProps {
  factor: EstimateFactor;
  onChange: (value: number) => void;
  onDelete: () => void;
}

function FactorRow({ factor, onChange, onDelete }: FactorRowProps) {
  const t = useT();
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="min-w-0 flex-1 truncate text-row font-medium">{t('Số {{label}}', { label: factor.label })}</span>
      <Stepper
        value={factor.value}
        min={1}
        max={MAX_FACTOR}
        label={t('Số {{label}}', { label: factor.label })}
        decrementLabel={t('Giảm {{label}}', { label: factor.label })}
        incrementLabel={t('Tăng {{label}}', { label: factor.label })}
        onChange={onChange}
      />
      <IconButton icon="trash" label={t('Xoá con số {{label}}', { label: factor.label })} size="sm" onClick={onDelete} />
    </li>
  );
}
