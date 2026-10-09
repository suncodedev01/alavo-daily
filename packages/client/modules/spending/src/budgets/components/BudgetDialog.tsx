import { useEngineMutation, type BudgetLine } from '@alavo-daily/common/engine';
import { formatVnd, formatVndInput, parseVndInput } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Button } from '@alavo-daily/design-system';
import { useState } from 'react';

import { describeEngineError } from '../../engine-errors';
import { FormDialog } from '../../form-dialogs';
import { MoneyField } from '../../money';

export interface BudgetDialogProps {
  line: BudgetLine | null;
  onClose: () => void;
}

export function BudgetDialog({ line, onClose }: BudgetDialogProps) {
  return line === null ? null : <BudgetForm line={line} onClose={onClose} />;
}

function BudgetForm({ line, onClose }: { line: BudgetLine; onClose: () => void }) {
  const t = useT();
  const update = useEngineMutation('spending.update_category');
  const [amount, setAmount] = useState(formatVndInput(String(line.budgetVnd)));
  const [problem, setProblem] = useState<string | null>(null);
  const name = t(line.name);

  const save = (budgetVnd: number | null) =>
    update.mutate(
      { id: line.categoryId, budgetVnd },
      { onSuccess: onClose, onError: (error) => setProblem(describeEngineError(error, t)) },
    );

  const submit = () => {
    const budgetVnd = parseVndInput(amount);
    if (budgetVnd <= 0) return setProblem(t('Nhập ngân sách lớn hơn 0.'));
    save(budgetVnd);
  };

  return (
    <FormDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={t('Ngân sách {{name}}', { name })}
      description={t('Đã chi {{amount}} trong tháng này.', { amount: formatVnd(line.spentVnd) })}
      submitLabel={t('Lưu ngân sách')}
      onSubmit={submit}
      pending={update.isPending}
      error={problem}
    >
      <MoneyField autoFocus value={amount} onValueChange={setAmount} label={t('Ngân sách tháng')} leadingIcon="chart-pie-slice" />
      <Button variant="destructive-outline" size="sm" className="justify-self-start" onClick={() => save(null)}>
        {t('Bỏ ngân sách')}
      </Button>
    </FormDialog>
  );
}
