import { useSyncExternalStore } from 'react';

import type { TimerBank } from '../logic/timerBank';

export function useTimerSeconds(bank: TimerBank, step: number): number {
  return useSyncExternalStore(bank.subscribe, () => bank.secondsLeft(step));
}
