import { useSyncExternalStore } from 'react';

import type { TimerBank } from '../logic/timerBank';

export function useRunningTimers(bank: TimerBank, exceptStep: number): { step: number; seconds: number }[] {
  const snapshot = useSyncExternalStore(bank.subscribe, () => bank.runningSnapshot(exceptStep));
  if (snapshot === '') return [];
  return snapshot.split('|').map((part) => {
    const [step = '0', seconds = '0'] = part.split(':');
    return { step: Number(step), seconds: Number(seconds) };
  });
}
