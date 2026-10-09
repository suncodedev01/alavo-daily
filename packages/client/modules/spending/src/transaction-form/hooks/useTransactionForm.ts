import { useEngineMutation } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { useState } from 'react';

import { describeEngineError } from '../../engine-errors';
import { draftFromTransaction, newDraft, toNewTransaction, toUpdateTransaction, validateDraft, withKind } from '../logic/transactionForm';
import type { TransactionFormOptions, TransactionFormState } from '../types';

export function useTransactionForm({ editing, lookups, today, onSaved }: TransactionFormOptions): TransactionFormState {
  const t = useT();
  const record = useEngineMutation('spending.record_transaction');
  const update = useEngineMutation('spending.update_transaction');
  const [draft, setDraft] = useState(() =>
    editing ? draftFromTransaction(editing, lookups.categories) : newDraft(today, lookups.categories, lookups.wallets),
  );
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = () => {
    setAttempted(true);
    if (Object.keys(validateDraft(draft)).length > 0) return;
    const categoryName = lookups.categoryName(draft.categoryId);
    const callbacks = {
      onSuccess: onSaved,
      onError: (error: unknown) => setServerError(describeEngineError(error, t)),
    };
    if (editing) update.mutate(toUpdateTransaction(editing.id, draft, categoryName), callbacks);
    else record.mutate(toNewTransaction(draft, categoryName), callbacks);
  };

  return {
    draft,
    errors: attempted ? validateDraft(draft) : {},
    serverError,
    pending: record.isPending || update.isPending,
    patch: (changes) => setDraft((current) => ({ ...current, ...changes })),
    setKind: (kind) => setDraft((current) => withKind(current, kind, lookups.categories)),
    submit,
  };
}
