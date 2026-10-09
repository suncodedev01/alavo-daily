import { useEngineMutation } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { useToast } from '@alavo-daily/design-system';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { describeEngineError } from '../../engine-errors';
import { transactionListPath } from '../../transaction-model';
import { selectedRows } from '../logic/draftRows';
import type { DraftRow } from '../types';

export interface ConfirmImport {
  confirm: (walletId: string, rows: readonly DraftRow[]) => void;
  pending: boolean;
  error: string | null;
}

/** Records the chosen lines in a wallet, then goes to the transaction list with a result message. */
export function useConfirmImport(): ConfirmImport {
  const t = useT();
  const { toast } = useToast();
  const navigate = useNavigate();
  const importRows = useEngineMutation('spending.import_transactions');
  const [error, setError] = useState<string | null>(null);

  const confirm = (walletId: string, rows: readonly DraftRow[]) =>
    importRows.mutate(
      { walletId, rows: selectedRows(rows) },
      {
        onSuccess: (result) => {
          toast(resultMessage(result.imported, result.skippedDuplicates, t));
          navigate(transactionListPath(null));
        },
        onError: (failure) => setError(describeEngineError(failure, t)),
      },
    );

  return { confirm, pending: importRows.isPending, error };
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

function resultMessage(imported: number, skipped: number, t: Translate): string {
  const done = t('Đã nhập {{count}} giao dịch', { count: imported });
  return skipped === 0 ? done : `${done}, ${t('bỏ qua {{count}} giao dịch đã có', { count: skipped })}`;
}
