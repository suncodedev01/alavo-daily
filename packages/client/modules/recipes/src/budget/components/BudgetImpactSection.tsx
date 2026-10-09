import { useEngineMutation } from '@alavo-daily/common/engine';
import { formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { ContextSection, useToast } from '@alavo-daily/design-system';

import { useReportError } from '../../engine-errors';
import { BudgetImpact } from './BudgetImpact';
import { useFoodBudgetLine } from '../hooks/useFoodBudgetLine';

export interface BudgetImpactSectionProps {
  today: string;
  extraVnd: number;
  logged: boolean;
}

export function BudgetImpactSection({ today, extraVnd, logged }: BudgetImpactSectionProps) {
  const t = useT();
  const { toast } = useToast();
  const reportError = useReportError();
  const line = useFoodBudgetLine(today);
  const updateCategory = useEngineMutation('spending.update_category');
  if (!line) return null;
  const raise = (byVnd: number) =>
    updateCategory.mutate(
      { id: line.categoryId, budgetVnd: line.budgetVnd + byVnd },
      {
        onSuccess: () => toast(t('Đã tăng ngân sách Ăn uống thêm {{amount}}', { amount: formatVnd(byVnd) })),
        onError: reportError,
      },
    );
  return (
    <ContextSection title={t('Ảnh hưởng đến ngân sách')} defaultOpen>
      <BudgetImpact line={line} extraVnd={extraVnd} logged={logged} onRaise={raise} />
    </ContextSection>
  );
}
