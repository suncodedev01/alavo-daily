import { toDateText } from '@alavo-daily/common/format';
import { useState } from 'react';

export function useToday(): string {
  const [today] = useState(() => toDateText(new Date()));
  return today;
}
