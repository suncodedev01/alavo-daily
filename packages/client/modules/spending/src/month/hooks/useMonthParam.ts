import { monthOf } from '@alavo-daily/common/format';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

import { useToday } from '../../today';
import type { MonthParam } from '../types';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function useMonthParam(): MonthParam {
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const raw = params.get('month');
  const month = raw !== null && MONTH_PATTERN.test(raw) ? raw : monthOf(today);
  const setMonth = useCallback(
    (next: string) =>
      setParams(
        (previous) => {
          const updated = new URLSearchParams(previous);
          updated.set('month', next);
          return updated;
        },
        { replace: true },
      ),
    [setParams],
  );
  return { month, today, isCurrentMonth: month === monthOf(today), setMonth };
}
