import type { SpendingReport } from '@alavo-daily/common/engine';
import { formatSignedVnd, formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Card, Eyebrow } from '@alavo-daily/design-system';

import { MoneyAmount } from '../../money';

export function ReportStats({ report }: { report: SpendingReport }) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      <Card aria-label={t('Thu nhập')}>
        <Eyebrow>{t('Thu nhập')}</Eyebrow>
        <p className="mt-2 text-2xl font-semibold text-income-fg max-lg:text-title">
          {formatSignedVnd(report.incomeVnd)}
        </p>
      </Card>
      <Card aria-label={t('Chi tiêu')}>
        <Eyebrow>{t('Chi tiêu')}</Eyebrow>
        <p className="mt-2 text-2xl font-semibold text-expense-fg max-lg:text-title">{formatVnd(report.expenseVnd)}</p>
      </Card>
      <Card aria-label={t('Chênh lệch')} className="col-span-2 lg:col-span-1">
        <Eyebrow>{t('Chênh lệch thu chi')}</Eyebrow>
        <p className="mt-2 text-2xl font-semibold max-lg:text-title">
          <MoneyAmount amountVnd={report.netVnd} />
        </p>
        <p className="mt-2 text-xs text-text-muted">{t('{{total}} giao dịch', { total: report.transactionCount })}</p>
      </Card>
    </div>
  );
}
