import { useEffect, useState } from 'react';

/**
 * The current time, renewed when `millisUntilRefresh` says the screen may need to change, and
 * again when the tab becomes visible, because a sleeping computer or a background tab can miss
 * a timer. `millisUntilRefresh` must keep the same identity between renders.
 */
export function useNow(millisUntilRefresh: (now: Date) => number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => keepNowFresh(() => setNow(new Date()), millisUntilRefresh), [millisUntilRefresh]);
  return now;
}

function keepNowFresh(refresh: () => void, millisUntilRefresh: (now: Date) => number): () => void {
  let timer: ReturnType<typeof setTimeout>;
  const scheduleNext = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      refresh();
      scheduleNext();
    }, millisUntilRefresh(new Date()));
  };
  const onVisibilityChange = () => {
    if (document.visibilityState !== 'visible') return;
    refresh();
    scheduleNext();
  };
  scheduleNext();
  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
