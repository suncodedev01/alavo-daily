import { useEngineMutation, type Goal } from '@alavo-daily/common/engine';
import { formatVnd, parseVndInput } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { useToast } from '@alavo-daily/design-system';
import { useState } from 'react';

import { describeEngineError } from '../../engine-errors';
import { FormDialog } from '../../form-dialogs';
import { MoneyField } from '../../money';

export interface ContributeDialogProps {
  goal: Goal | null;
  onClose: () => void;
}

export function ContributeDialog({ goal, onClose }: ContributeDialogProps) {
  return goal === null ? null : <ContributeForm goal={goal} onClose={onClose} />;
}

function ContributeForm({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const t = useT();
  const { toast } = useToast();
  const contribute = useEngineMutation('spending.contribute_goal');
  const [amount, setAmount] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const submit = () => {
    const amountVnd = parseVndInput(amount);
    if (amountVnd <= 0) return setProblem(t('Nhập số tiền lớn hơn 0.'));
    contribute.mutate(
      { id: goal.id, amountVnd },
      {
        onSuccess: () => {
          toast(t('Đã thêm {{amount}} vào {{name}}', { amount: formatVnd(amountVnd), name: goal.name }));
          onClose();
        },
        onError: (error) => setProblem(describeEngineError(error, t)),
      },
    );
  };

  return (
    <FormDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={t('Thêm tiền vào {{name}}', { name: goal.name })}
      description={t('Đã có {{saved}} trên {{target}}.', { saved: formatVnd(goal.savedVnd), target: formatVnd(goal.targetVnd) })}
      submitLabel={t('Thêm tiền')}
      onSubmit={submit}
      pending={contribute.isPending}
      error={problem}
    >
      <MoneyField autoFocus value={amount} onValueChange={setAmount} label={t('Số tiền thêm vào')} leadingIcon="piggy-bank" />
    </FormDialog>
  );
}
