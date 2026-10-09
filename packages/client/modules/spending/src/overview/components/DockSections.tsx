import { useEngineQuery } from '@alavo-daily/common/engine';
import { dayAndMonth, formatPercent, formatVnd, weekdayName } from '@alavo-daily/common/format';
import { useLanguage, useT } from '@alavo-daily/common';
import { Button, ContextSection, StickerTile } from '@alavo-daily/design-system';
import { useState } from 'react';

import { BillsDialog } from '../../bills';
import { Loadable, SkeletonRows } from '../../query-state';
import { deltaRatio } from '../logic/delta';
import type { UpcomingBill } from '../types';
import { upcomingBills } from '../logic/upcoming';

const UPCOMING_LIMIT = 4;

export function UpcomingBillsSection({ today }: { today: string }) {
  const t = useT();
  const bills = useEngineQuery('spending.list_bills');
  const [managing, setManaging] = useState(false);
  return (
    <ContextSection title={t('Sắp đến hạn')} defaultOpen>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <Loadable query={bills} skeleton={<SkeletonRows count={2} className="h-10 w-full" />}>
          {(items) => <UpcomingList items={upcomingBills(items, today, UPCOMING_LIMIT)} />}
        </Loadable>
        <Button variant="outline" size="sm" leadingIcon="repeat" className="justify-self-start" onClick={() => setManaging(true)}>
          {t('Quản lý khoản định kỳ')}
        </Button>
      </div>
      <BillsDialog open={managing} onOpenChange={setManaging} />
    </ContextSection>
  );
}

function UpcomingList({ items }: { items: UpcomingBill[] }) {
  const language = useLanguage();
  const t = useT();
  if (items.length === 0) {
    return <p className="text-sm text-text-muted">{t('Chưa có khoản định kỳ nào sắp đến hạn.')}</p>;
  }
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {items.map(({ bill, dueOn }) => (
        <li key={bill.id} className="flex items-center gap-3">
          <StickerTile icon={bill.icon} kind="category" size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{bill.title}</span>
            <span className="block text-xs text-text-muted">{`${weekdayName(dueOn, language)}, ${dayAndMonth(dueOn, language)}`}</span>
          </span>
          <span className="text-sm font-medium whitespace-nowrap">{formatVnd(bill.amountVnd)}</span>
        </li>
      ))}
    </ul>
  );
}

export function MonthComparisonSection({ month, today }: { month: string; today: string }) {
  const t = useT();
  const summary = useEngineQuery('spending.month_summary', { month, today });
  return (
    <ContextSection title={t('Tháng này so với tháng trước')}>
      <Loadable query={summary} skeleton={<SkeletonRows count={1} className="h-12 w-full" />}>
        {(data) => {
          const delta = deltaRatio(data.expenseVnd, data.previousExpenseVnd);
          if (delta === null) {
            return <p className="text-sm text-text-secondary">{t('Tháng trước chưa có chi tiêu để so sánh.')}</p>;
          }
          const values = {
            current: formatVnd(data.expenseVnd),
            previous: formatVnd(data.previousExpenseVnd),
            pct: formatPercent(Math.abs(delta)),
          };
          return (
            <p className="text-sm text-text-secondary">
              {delta < 0
                ? t('Chi {{current}} so với {{previous}}, thấp hơn {{pct}}.', values)
                : t('Chi {{current}} so với {{previous}}, cao hơn {{pct}}.', values)}
            </p>
          );
        }}
      </Loadable>
    </ContextSection>
  );
}
