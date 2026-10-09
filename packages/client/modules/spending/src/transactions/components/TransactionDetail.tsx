import { useEngineMutation, useEngineQuery, type Transaction } from '@alavo-daily/common/engine';
import { parseDateText, relativeDayLabel } from '@alavo-daily/common/format';
import { useLanguage, useT } from '@alavo-daily/common';
import { Button, Card, EmptyState, IconTile, Skeleton, useToast } from '@alavo-daily/design-system';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { useLookups, type Lookups } from '../../lookups';
import { useToday } from '../../today';
import { TransactionDialog } from '../../transaction-form';
import { DeleteConfirm } from '../../form-dialogs';
import { InlineError } from '../../query-state';
import { MoneyAmount } from '../../money';
import { recurrenceOf, StopRecurrenceButton } from '../../recurring';
import { transactionListPath } from '../../transaction-model';

export function TransactionDetail({ id }: { id: string }) {
  const t = useT();
  const query = useEngineQuery('spending.get_transaction', { id });
  const lookups = useLookups();
  const [params] = useSearchParams();
  if (query.isError) {
    const missing = query.error.code === 'not_found';
    return missing ? (
      <EmptyState
        icon="receipt-x"
        title={t('Không tìm thấy giao dịch')}
        description={t('Giao dịch này có thể đã bị xoá.')}
        action={
          <Link className="text-sm font-medium text-accent-fg" to={transactionListPath(params.get('month'))}>
            {t('Về danh sách giao dịch')}
          </Link>
        }
      />
    ) : (
      <InlineError message={t('Không tải được giao dịch.')} onRetry={() => void query.refetch()} />
    );
  }
  if (!query.data || lookups.isPending) {
    return (
      <div role="status" aria-label={t('Đang tải')}>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  return <DetailCard transaction={query.data} lookups={lookups} />;
}

function DetailCard({ transaction, lookups }: { transaction: Transaction; lookups: Lookups }) {
  const language = useLanguage();
  const t = useT();
  const today = useToday();
  const categoryName = lookups.categoryName(transaction.categoryId);
  return (
    <Card className="mx-auto grid w-full max-w-160 gap-4">
      <div className="flex items-center gap-3">
        <IconTile icon={lookups.categoryIcon(transaction.categoryId)} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-title font-semibold">{transaction.title}</h2>
          <p className="truncate text-xs text-text-muted">{`${relativeDayLabel(transaction.occurredOn, today, language)} · ${categoryName}`}</p>
        </div>
      </div>
      <MoneyAmount amountVnd={transaction.amountVnd} className="text-display font-semibold" />
      <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-sm">
        <Fact label={t('Thanh toán bằng')} value={lookups.walletName(transaction.walletId)} />
        <Fact label={t('Danh mục')} value={categoryName} />
        <Fact label={t('Ngày')} value={fullDate(transaction.occurredOn)} />
        <Fact label={t('Lặp lại')} value={recurrenceText(transaction, t)} />
        {transaction.note ? <Fact label={t('Ghi chú')} value={transaction.note} /> : null}
      </dl>
      <DetailActions transaction={transaction} />
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-text-muted">{label}</dt>
      <dd className="col-span-2 min-w-0 break-words text-text-primary">{value}</dd>
    </>
  );
}

function fullDate(date: string): string {
  const parsed = parseDateText(date);
  return `${parsed.getDate()}/${parsed.getMonth() + 1}/${parsed.getFullYear()}`;
}

function recurrenceText(transaction: Transaction, t: (key: string, values?: Record<string, string | number>) => string): string {
  const recurrence = recurrenceOf(transaction);
  if (recurrence.kind === 'generated') return t('Tự động tạo từ giao dịch lặp lại hằng tháng');
  return recurrence.kind === 'none' ? t('Không') : t('Hằng tháng · ngày {{day}}', { day: recurrence.day });
}

function DetailActions({ transaction }: { transaction: Transaction }) {
  const t = useT();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const remove = useEngineMutation('spending.delete_transaction');
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const deleteAndLeave = async () => {
    await remove.mutateAsync({ id: transaction.id });
    toast(t('Đã xoá giao dịch'));
    navigate(transactionListPath(params.get('month')));
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" leadingIcon="pencil-simple" onClick={() => setEditing(true)}>
        {t('Sửa')}
      </Button>
      <StopRecurrenceButton transaction={transaction} />
      <Button variant="destructive-outline" size="sm" leadingIcon="trash" onClick={() => setConfirming(true)}>
        {t('Xoá')}
      </Button>
      <TransactionDialog open={editing} onOpenChange={setEditing} editing={transaction} />
      <DeleteConfirm
        open={confirming}
        onOpenChange={setConfirming}
        title={t('Xoá giao dịch này?')}
        description={t('Số dư các ví sẽ được tính lại. Không hoàn tác được.')}
        failureTitle={t('Không xoá được giao dịch')}
        onDelete={deleteAndLeave}
      />
    </div>
  );
}
