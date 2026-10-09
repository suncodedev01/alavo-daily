import type { Transaction } from '@alavo-daily/common/engine';
import { relativeDayLabel } from '@alavo-daily/common/format';
import { useLanguage, useT } from '@alavo-daily/common';
import { Button, Card, EmptyState, Eyebrow, useLayout } from '@alavo-daily/design-system';

import type { Lookups } from '../../lookups';
import { useOpenAddTransaction } from '../../transaction-form';
import { transactionPath } from '../../transaction-model';
import { groupByDay } from '../logic/transactionList';
import type { DayGroup } from '../types';
import { TransactionRow } from './TransactionRow';

export interface TransactionGroupsProps {
  all: readonly Transaction[];
  visible: readonly Transaction[];
  lookups: Lookups;
  today: string;
  month: string | null;
  selectedId: string | null;
}

export function TransactionGroups({ all, visible, lookups, today, month, selectedId }: TransactionGroupsProps) {
  const t = useT();
  const openAdd = useOpenAddTransaction();
  if (all.length === 0) {
    return (
      <EmptyState
        icon="receipt"
        title={t('Chưa có giao dịch nào trong tháng này')}
        description={t('Ghi khoản chi đầu tiên để biết tiền đang đi đâu.')}
        action={
          <Button leadingIcon="plus" onClick={openAdd}>
            {t('Thêm giao dịch')}
          </Button>
        }
      />
    );
  }
  if (visible.length === 0) {
    return <p className="px-3 py-8 text-center text-sm text-text-muted">{t('Không có giao dịch khớp bộ lọc.')}</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-1">
      {groupByDay(visible).map((group) => (
        <DaySection key={group.date} group={group} lookups={lookups} today={today} month={month} selectedId={selectedId} />
      ))}
    </div>
  );
}

interface DaySectionProps {
  group: DayGroup;
  lookups: Lookups;
  today: string;
  month: string | null;
  selectedId: string | null;
}

function DaySection({ group, lookups, today, month, selectedId }: DaySectionProps) {
  const language = useLanguage();
  const layout = useLayout();
  const rows = group.items.map((item) => (
    <TransactionRow
      key={item.id}
      transaction={item}
      lookups={lookups}
      to={transactionPath(item.id, month)}
      active={item.id === selectedId}
    />
  ));
  return (
    <section aria-label={relativeDayLabel(group.date, today, language)} className="grid grid-cols-1 gap-1">
      <Eyebrow as="h3" className="px-3 pt-3">
        {relativeDayLabel(group.date, today, language)}
      </Eyebrow>
      {layout === 'narrow' ? <Card padding="none"><div className="grid grid-cols-1 gap-1 p-1">{rows}</div></Card> : rows}
    </section>
  );
}
