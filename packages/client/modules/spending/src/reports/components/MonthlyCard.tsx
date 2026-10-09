import type { MonthBar } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';

import { SectionCard } from '../../overview';
import { buildMonthBars } from '../logic/monthBars';
import { MonthlyBars } from './MonthlyBars';

export function MonthlyCard({ months }: { months: readonly MonthBar[] }) {
  const t = useT();
  const model = buildMonthBars(months);
  const first = model.groups[0]?.label ?? '';
  const last = model.groups.at(-1)?.label ?? '';
  const expenseLabel = t('Chi tiêu');
  const incomeLabel = t('Thu nhập');
  return (
    <SectionCard title={t('Thu chi theo tháng')}>
      <div className="grid gap-2">
        <MonthlyBars
          model={model}
          label={t('Thu và chi theo tháng, từ {{first}} đến {{last}}', { first, last })}
          expenseLabel={expenseLabel}
          incomeLabel={incomeLabel}
        />
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
          <li className="flex items-center gap-1.5">
            <i aria-hidden className="size-2.5 rounded-sm bg-chart-1" />
            {expenseLabel}
          </li>
          <li className="flex items-center gap-1.5">
            <i aria-hidden className="size-2.5 rounded-sm bg-chart-2" />
            {incomeLabel}
          </li>
        </ul>
      </div>
    </SectionCard>
  );
}
