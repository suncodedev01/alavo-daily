import { useEngineMutation, type Estimate } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, ResponsiveDialog, Segmented } from '@alavo-daily/design-system';

import { formatBalance } from '../../money';
import { CONTINGENCY_CHOICES } from '../logic/templates';

export interface ContingencyDialogProps {
  estimate: Estimate;
  /** What the current percent comes to, so the person sees the effect of a change. */
  contingencyVnd: number;
  onClose: () => void;
}

/** How much to set aside for what was not thought of, in percent of the items. */
export function ContingencyDialog({ estimate, contingencyVnd, onClose }: ContingencyDialogProps) {
  const t = useT();
  const update = useEngineMutation('spending.update_estimate');
  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t('Dự phòng phát sinh')}
      description={t('Chừa sẵn cho những khoản chưa tính tới. Tỉ lệ này tính trên tổng các khoản.')}
      footer={<Button onClick={onClose}>{t('Đóng')}</Button>}
    >
      <Segmented
        label={t('Dự phòng phát sinh')}
        value={String(estimate.contingencyPercent)}
        onChange={(value) => update.mutate({ id: estimate.id, contingencyPercent: Number(value) })}
        options={CONTINGENCY_CHOICES.map((percent) => ({ value: String(percent), label: `${percent}%` }))}
      />
      <p className="text-sm text-text-muted">
        {t('Hiện đang chừa {{amount}}.', { amount: formatBalance(contingencyVnd) })}
      </p>
    </ResponsiveDialog>
  );
}
