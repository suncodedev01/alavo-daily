import type { Step } from '@alavo-daily/common/engine';
import { useEffect, useState } from 'react';

import { durationsOf } from '../logic/durationsOf';
import { TimerBank } from '../logic/timerBank';

export function useTimerBank(steps: readonly Step[]): TimerBank {
  const [bank] = useState(() => new TimerBank(durationsOf(steps)));
  useEffect(() => () => bank.stopClock(), [bank]);
  return bank;
}
