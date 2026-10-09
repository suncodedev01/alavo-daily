import type { Category, CategoryKind } from '@alavo-daily/common/engine';
import { useEngineMutation } from '@alavo-daily/common/engine';
import { parseVndInput } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Eyebrow, Field } from '@alavo-daily/design-system';
import { useState } from 'react';

import { describeEngineError } from '../../engine-errors';
import { FormDialog, IconGrid } from '../../form-dialogs';
import { MoneyField } from '../../money';
import { CATEGORY_ICONS } from '../logic/categoryIcons';

const NAME_MAX_LENGTH = 24;

export interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: CategoryKind;
  requireBudget?: boolean;
  onCreated: (category: Category) => void;
}

export function CategoryDialog({ open, onOpenChange, kind, requireBudget = false, onCreated }: CategoryDialogProps) {
  return open ? (
    <CategoryForm onOpenChange={onOpenChange} kind={kind} requireBudget={requireBudget} onCreated={onCreated} />
  ) : null;
}

type FormProps = Omit<CategoryDialogProps, 'open'>;

function CategoryForm({ onOpenChange, kind, requireBudget = false, onCreated }: FormProps) {
  const t = useT();
  const create = useEngineMutation('spending.create_category');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(CATEGORY_ICONS[0]);
  const [budget, setBudget] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const showBudget = kind === 'expense';

  const submit = () => {
    const budgetVnd = parseVndInput(budget);
    if (name.trim() === '') return setProblem(t('Nhập tên hạng mục.'));
    if (requireBudget && budgetVnd <= 0) return setProblem(t('Nhập ngân sách hằng tháng cho hạng mục này.'));
    create.mutate(
      { name: name.trim(), icon, kind, budgetVnd: showBudget && budgetVnd > 0 ? budgetVnd : null },
      {
        onSuccess: (category) => {
          onCreated(category);
          onOpenChange(false);
        },
        onError: (error) => setProblem(describeEngineError(error, t)),
      },
    );
  };

  return (
    <FormDialog open onOpenChange={onOpenChange} title={t('Hạng mục mới')} submitLabel={t('Tạo hạng mục')} onSubmit={submit} pending={create.isPending} error={problem}>
      <Field
        autoFocus
        leadingIcon="tag"
        aria-label={t('Tên hạng mục')}
        placeholder={t('Tên hạng mục (ví dụ: Thú cưng)')}
        maxLength={NAME_MAX_LENGTH}
        autoComplete="off"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <div className="grid gap-2">
        <Eyebrow>{t('Biểu tượng')}</Eyebrow>
        <IconGrid icons={CATEGORY_ICONS} value={icon} onChange={setIcon} label={t('Biểu tượng')} />
      </div>
      {showBudget ? (
        <div className="grid gap-2">
          <Eyebrow>{requireBudget ? t('Ngân sách tháng') : t('Ngân sách tháng (không bắt buộc)')}</Eyebrow>
          <MoneyField value={budget} onValueChange={setBudget} label={t('Ngân sách tháng')} placeholder={t('Ví dụ: 500.000')} leadingIcon="chart-pie-slice" />
          {requireBudget ? null : (
            <p className="text-xs text-text-muted">{t('Để trống nếu chỉ muốn theo dõi chi tiêu, chưa đặt giới hạn.')}</p>
          )}
        </div>
      ) : null}
    </FormDialog>
  );
}
