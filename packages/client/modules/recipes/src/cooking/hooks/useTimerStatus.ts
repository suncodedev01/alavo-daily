import { useSyncExternalStore } from 'react';

import type { TimerStatus } from '../types';
import type { TimerBank } from '../logic/timerBank';

export function useTimerStatus(bank: TimerBank, step: number): TimerStatus {
  return useSyncExternalStore(bank.subscribe, () => bank.status(step));
}
