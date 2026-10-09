import { toDateText } from '@alavo-daily/common/format';
import { useEffect, useState } from 'react';

import { millisUntilNextDay } from '../logic/nextDay';

function currentDate(): string {
  return toDateText(new Date());
}

/**
 * The local date as `YYYY-MM-DD`. It changes at local midnight, and again when the tab becomes
 * visible, because a sleeping computer or a background tab can miss the midnight timer.
 */
export function useToday(): string {
  const [today, setToday] = useState(currentDate);
  useEffect(() => keepDateFresh(() => setToday(currentDate())), []);
  return today;
}

function keepDateFresh(refresh: () => void): () => void {
  let timer: ReturnType<typeof setTimeout>;
  const scheduleMidnight = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      refresh();
      scheduleMidnight();
    }, millisUntilNextDay(new Date()));
  };
  const onVisibilityChange = () => {
    if (document.visibilityState !== 'visible') return;
    refresh();
    scheduleMidnight();
  };
  scheduleMidnight();
  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
