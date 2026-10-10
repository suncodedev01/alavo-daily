import { useState } from 'react';

import { useEngineMutation, useEngineQuery, type EstimateView } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Eyebrow, Field, Pill } from '@alavo-daily/design-system';

import { describeEngineError } from '../../engine-errors';
import { FormDialog } from '../../form-dialogs';
import { ESTIMATE_TEMPLATES, type EstimateTemplate } from '../logic/templates';

export interface EstimateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The template to start from, when the person picked one before opening the form. */
  template?: EstimateTemplate;
  onCreated: (view: EstimateView) => void;
}

const FIRST_FACTOR_VALUE = 1;

export function EstimateFormDialog({ open, onOpenChange, template, onCreated }: EstimateFormDialogProps) {
  return open ? <EstimateForm onOpenChange={onOpenChange} template={template} onCreated={onCreated} /> : null;
}

function EstimateForm({ onOpenChange, template, onCreated }: Omit<EstimateFormDialogProps, 'open'>) {
  const t = useT();
  const create = useEngineMutation('spending.create_estimate');
  const wallets = useEngineQuery('spending.list_wallets');
  const [chosen, setChosen] = useState<EstimateTemplate>(template ?? ESTIMATE_TEMPLATES[ESTIMATE_TEMPLATES.length - 1]!);
  const [name, setName] = useState(template && template.id !== 'custom' ? t(template.label) : '');
  const [problem, setProblem] = useState<string | null>(null);

  const submit = () => {
    if (name.trim() === '') return setProblem(t('Nhập tên dự toán.'));
    create.mutate(
      {
        name: name.trim(),
        icon: chosen.icon,
        contingencyPercent: chosen.contingencyPercent,
        walletIds: (wallets.data ?? []).map((wallet) => wallet.id),
        factors: chosen.factors.map((label) => ({ label: t(label), value: FIRST_FACTOR_VALUE })),
      },
      {
        onSuccess: (view) => {
          onCreated(view);
          onOpenChange(false);
        },
        onError: (error) => setProblem(describeEngineError(error, t)),
      },
    );
  };

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={t('Dự toán mới')}
      submitLabel={t('Tạo dự toán')}
      onSubmit={submit}
      pending={create.isPending}
      error={problem}
    >
      <Field
        autoFocus
        leadingIcon="calculator"
        aria-label={t('Tên dự toán')}
        placeholder={t('Tên dự toán (ví dụ: Đám cưới)')}
        autoComplete="off"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <div className="grid gap-2">
        <Eyebrow>{t('Bắt đầu từ mẫu')}</Eyebrow>
        <div role="group" aria-label={t('Bắt đầu từ mẫu')} className="flex flex-wrap gap-2">
          {ESTIMATE_TEMPLATES.map((entry) => (
            <Pill key={entry.id} selected={entry.id === chosen.id} leadingIcon={entry.icon} onClick={() => setChosen(entry)}>
              {t(entry.label)}
            </Pill>
          ))}
        </div>
        <p className="text-xs text-text-muted">{t('Mẫu chỉ gợi ý sẵn nhóm khoản và các con số, bạn đổi được hết sau đó.')}</p>
      </div>
    </FormDialog>
  );
}
