import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

import { NEW_TRANSACTION_PARAM } from '../logic/addTransactionParam';

export function useOpenAddTransaction(): () => void {
  const [, setParams] = useSearchParams();
  return useCallback(() => {
    setParams(
      (previous) => {
        const updated = new URLSearchParams(previous);
        updated.set(NEW_TRANSACTION_PARAM, '1');
        return updated;
      },
      { replace: true },
    );
  }, [setParams]);
}
