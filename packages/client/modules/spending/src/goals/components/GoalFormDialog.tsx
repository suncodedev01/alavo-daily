import { useEngineMutation, type Goal } from '@alavo-daily/common/engine';
import { addDays, formatVndInput, parseVndInput } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Eyebrow, Field, Switch } from '@alavo-daily/design-system';
import { useState } from 'react';

import { GOAL_ICONS } from '../logic/goalIcons';
import { DatePicker } from '../../datepicker';
import { describeEngineError } from '../../engine-errors';
import { useToday } from '../../month';
import { FormDialog, IconGrid } from '../../form-dialogs';
import { MoneyField } from '../../money';

export interface GoalFormDialogProps {
  editing: Goal | 'new' | null;
  onClose: () => void;
}

const DEFAULT_DUE_DAYS = 90;

export function GoalFormDialog({ editing, onClose }: GoalFormDialogProps) {
  if (editing === null) return null;
  return <GoalForm existing={editing === 'new' ? null : editing} onClose={onClose} />;
}

function GoalForm({ existing, onClose }: { existing: Goal | null; onClose: () => void }) {
  const t = useT();
  const today = useToday();
  const create = useEngineMutation('spending.create_goal');
  const update = useEngineMutation('spending.update_goal');
  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState<string>(existing?.icon ?? GOAL_ICONS[0]);
  const [target, setTarget] = useState(formatVndInput(String(existing?.targetVnd ?? '')));
  const [saved, setSaved] = useState('');
  const [dueOn, setDueOn] = useState<string | null>(existing?.dueOn ?? null);
  const [problem, setProblem] = useState<string | null>(null);

  const submit = () => {
    const targetVnd = parseVndInput(target);
    if (name.trim() === '') return setProblem(t('Nhập tên mục tiêu.'));
    if (targetVnd <= 0) return setProblem(t('Nhập số tiền cần đạt lớn hơn 0.'));
    const callbacks = { onSuccess: onClose, onError: (error: unknown) => setProblem(describeEngineError(error, t)) };
    const fields = { name: name.trim(), icon, targetVnd, dueOn };
    if (existing) update.mutate({ id: existing.id, ...fields }, callbacks);
    else create.mutate({ ...fields, savedVnd: parseVndInput(saved) }, callbacks);
  };

  return (
    <FormDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={existing ? t('Sửa mục tiêu') : t('Mục tiêu mới')}
      submitLabel={existing ? t('Lưu thay đổi') : t('Tạo mục tiêu')}
      onSubmit={submit}
      pending={create.isPending || update.isPending}
      error={problem}
    >
      <Field
        autoFocus
        leadingIcon="target"
        aria-label={t('Tên mục tiêu')}
        placeholder={t('Tên mục tiêu (ví dụ: Du lịch Đà Lạt)')}
        autoComplete="off"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <IconGrid icons={GOAL_ICONS} value={icon} onChange={setIcon} label={t('Biểu tượng')} />
      <div className="grid gap-2">
        <Eyebrow>{t('Số tiền cần đạt')}</Eyebrow>
        <MoneyField value={target} onValueChange={setTarget} label={t('Số tiền cần đạt')} />
      </div>
      {existing ? null : (
        <div className="grid gap-2">
          <Eyebrow>{t('Đã có sẵn (không bắt buộc)')}</Eyebrow>
          <MoneyField value={saved} onValueChange={setSaved} label={t('Đã có sẵn')} />
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm">{t('Đặt hạn hoàn thành')}</span>
        <Switch
          label={t('Đặt hạn hoàn thành')}
          checked={dueOn !== null}
          onCheckedChange={(checked) => setDueOn(checked ? addDays(today, DEFAULT_DUE_DAYS) : null)}
        />
      </div>
      {dueOn === null ? null : <DatePicker label={t('Hạn hoàn thành')} value={dueOn} today={today} onChange={setDueOn} />}
    </FormDialog>
  );
}
