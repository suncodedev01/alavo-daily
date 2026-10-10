import { useState } from 'react';

import {
  useEngineMutation,
  type Estimate,
  type EstimateItem,
  type EstimatePriority,
} from '@alavo-daily/common/engine';
import { formatVndInput, parseVndInput } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Button, Checkbox, Eyebrow, Field, Pill, Segmented, Stepper } from '@alavo-daily/design-system';

import { describeEngineError } from '../../engine-errors';
import { FormDialog } from '../../form-dialogs';
import { MoneyField } from '../../money';
import { groupChoices } from '../logic/groupItems';
import { DEFAULT_GROUP, PRIORITIES, PRIORITY_LABELS } from '../logic/templates';

export interface ItemFormDialogProps {
  estimate: Estimate;
  /** The item to change, or `'new'`. */
  editing: EstimateItem | 'new';
  /** Group names the template suggests, offered after the ones already in use. */
  suggestedGroups: readonly string[];
  onClose: () => void;
}

const MAX_QUANTITY = 100_000;

export function ItemFormDialog({ estimate, editing, suggestedGroups, onClose }: ItemFormDialogProps) {
  const t = useT();
  const existing = editing === 'new' ? null : editing;
  const save = useEngineMutation('spending.save_estimate_item');
  const remove = useEngineMutation('spending.delete_estimate_item');
  const choices = groupChoices(estimate.items, suggestedGroups.map((name) => t(name)));
  const [name, setName] = useState(existing?.name ?? '');
  const [group, setGroup] = useState(existing?.group ?? choices[0] ?? t(DEFAULT_GROUP));
  const [price, setPrice] = useState(formatVndInput(String(existing?.price ?? '')));
  const [quantity, setQuantity] = useState(existing?.quantity ?? 1);
  const [priority, setPriority] = useState<EstimatePriority>(existing?.priority ?? 'must');
  const [by, setBy] = useState<string[]>(existing?.by ?? []);
  const [problem, setProblem] = useState<string | null>(null);
  const callbacks = { onSuccess: onClose, onError: (error: unknown) => setProblem(describeEngineError(error, t)) };

  const submit = () => {
    if (name.trim() === '') return setProblem(t('Nhập tên khoản.'));
    if (group.trim() === '') return setProblem(t('Nhập nhóm cho khoản này.'));
    save.mutate(
      { estimateId: estimate.id, id: existing?.id, group: group.trim(), name: name.trim(), price: parseVndInput(price), quantity, priority, by },
      callbacks,
    );
  };
  const toggleFactor = (id: string, on: boolean) => setBy((current) => (on ? [...current, id] : current.filter((entry) => entry !== id)));

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={existing ? t('Sửa khoản') : t('Thêm khoản cần mua')}
      submitLabel={t('Lưu khoản')}
      onSubmit={submit}
      pending={save.isPending || remove.isPending}
      error={problem}
    >
      <Field autoFocus leadingIcon="tag" aria-label={t('Tên khoản')} placeholder={t('Tên khoản (ví dụ: Chụp ảnh cưới)')} autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} />
      <div className="grid gap-2">
        <Eyebrow>{t('Nhóm')}</Eyebrow>
        <Field aria-label={t('Nhóm')} autoComplete="off" value={group} onChange={(event) => setGroup(event.target.value)} />
        <div className="flex flex-wrap gap-2">
          {choices.map((choice) => (
            <Pill key={choice} selected={choice === group} onClick={() => setGroup(choice)}>
              {choice}
            </Pill>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <Eyebrow>{t('Đơn giá')}</Eyebrow>
        <MoneyField value={price} onValueChange={setPrice} label={t('Đơn giá')} placeholder={t('Ví dụ: 450.000')} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-row font-medium">{t('Số lượng')}</span>
        <Stepper value={quantity} min={1} max={MAX_QUANTITY} label={t('Số lượng')} decrementLabel={t('Giảm số lượng')} incrementLabel={t('Tăng số lượng')} onChange={setQuantity} />
      </div>
      <div className="grid gap-2">
        <Eyebrow>{t('Mức cần thiết')}</Eyebrow>
        <Segmented
          label={t('Mức cần thiết')}
          value={priority}
          onChange={(value) => setPriority(PRIORITIES.find((entry) => entry === value) ?? 'must')}
          options={PRIORITIES.map((entry) => ({ value: entry, label: t(PRIORITY_LABELS[entry]) }))}
        />
      </div>
      {estimate.factors.length > 0 ? (
        <div className="grid gap-2">
          <Eyebrow>{t('Nhân theo')}</Eyebrow>
          {estimate.factors.map((factor) => (
            <Checkbox
              key={factor.id}
              label={t('Nhân theo số {{label}}', { label: factor.label })}
              checked={by.includes(factor.id)}
              onCheckedChange={(on) => toggleFactor(factor.id, on)}
            >
              {t('Số {{label}} ({{value}})', { label: factor.label, value: factor.value })}
            </Checkbox>
          ))}
        </div>
      ) : null}
      {existing ? (
        <Button variant="destructive-outline" leadingIcon="trash" onClick={() => remove.mutate({ estimateId: estimate.id, id: existing.id }, callbacks)}>
          {t('Xoá khoản này')}
        </Button>
      ) : null}
    </FormDialog>
  );
}
