import type { Step } from '@alavo-daily/common/engine';
import { useT, usePlatform } from '@alavo-daily/common';
import { useEffect, useState } from 'react';

import { playBeep } from '../logic/beep';
import type { TimerBank } from '../logic/timerBank';

export function useTimerAlert(bank: TimerBank, steps: readonly Step[]): [string | null, () => void] {
  const t = useT();
  const platform = usePlatform();
  const [alertText, setAlertText] = useState<string | null>(null);
  useEffect(
    () =>
      bank.onFinish((step) => {
        const text = steps[step]?.text ?? '';
        setAlertText(t('Hết giờ: {{step}}', { step: text }));
        playBeep();
        void platform.notify(t('Hết giờ'), text);
      }),
    [bank, steps, platform, t],
  );
  return [alertText, () => setAlertText(null)];
}
