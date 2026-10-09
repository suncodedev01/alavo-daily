import { useEngineMutation } from '@alavo-daily/common/engine';
import { useEffect } from 'react';

import { useToday } from '../../today';

/** Creates the recurring transactions that are due, once when the app opens and again each new day. */
export function useGenerateRecurring(): void {
  const today = useToday();
  const { mutate } = useEngineMutation('spending.generate_recurring');
  useEffect(() => mutate({ today }), [mutate, today]);
}
