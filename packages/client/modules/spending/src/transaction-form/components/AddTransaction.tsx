import { formatSignedVnd, monthOf } from '@alavo-daily/common/format';
import type { Transaction } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, useLayout, useToast } from '@alavo-daily/design-system';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

import { transactionPath } from '../../transaction-model';
import { NEW_TRANSACTION_PARAM } from '../logic/addTransactionParam';
import { useOpenAddTransaction } from '../hooks/useOpenAddTransaction';
import { TransactionDialog } from './TransactionDialog';

const TRANSACTIONS_PREFIX = '/spending/transactions';

export function AddTransactionButton() {
  const t = useT();
  const layout = useLayout();
  const open = useOpenAddTransaction();
  if (layout === 'narrow') return null;
  return (
    <Button leadingIcon="plus" onClick={open}>
      {t('Thêm giao dịch')}
    </Button>
  );
}

export function AddTransactionHost() {
  const t = useT();
  const layout = useLayout();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const open = params.get(NEW_TRANSACTION_PARAM) === '1';

  const close = () =>
    setParams(
      (previous) => {
        const updated = new URLSearchParams(previous);
        updated.delete(NEW_TRANSACTION_PARAM);
        return updated;
      },
      { replace: true },
    );

  const saved = (item: Transaction) => {
    toast(t('Đã lưu {{amount}}', { amount: formatSignedVnd(item.amountVnd) }));
    const onTransactions = location.pathname.startsWith(TRANSACTIONS_PREFIX);
    if (onTransactions && layout === 'wide') navigate(transactionPath(item.id, monthOf(item.occurredOn)));
  };

  return <TransactionDialog open={open} onOpenChange={(next) => !next && close()} onSaved={saved} />;
}
