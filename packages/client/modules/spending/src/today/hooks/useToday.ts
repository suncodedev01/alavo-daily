import { toDateText } from '@alavo-daily/common/format';
import { useEffect, useState } from 'react';

import { msUntilNextMidnight } from '../logic/midnight';

/** The local date as `YYYY-MM-DD`. It changes at local midnight and when the tab is shown again. */
export function useToday(): string {
  const [today, setToday] = useState(() => toDateText(new Date()));
  useEffect(() => followTheDay(setToday), []);
  return today;
}

function followTheDay(update: (today: string) => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const refresh = () => update(toDateText(new Date()));
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      refresh();
      arm();
    }, msUntilNextMidnight(new Date()));
  };
  const onVisibilityChange = () => {
    if (document.visibilityState !== 'visible') return;
    refresh();
    arm();
  };
  arm();
  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
