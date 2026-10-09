import { formatClock } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Button, IconButton, ProgressRing, useLayout } from '@alavo-daily/design-system';

import type { TimerBank } from '../logic/timerBank';
import type { TimerStatus } from '../types';
import { useTimerSeconds } from '../hooks/useTimerSeconds';
import { useTimerStatus } from '../hooks/useTimerStatus';

export function StepTimerPanel({ bank, step }: { bank: TimerBank; step: number }) {
  if (!bank.has(step)) return null;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <TimerReadout bank={bank} step={step} />
      <TimerControls bank={bank} step={step} />
    </div>
  );
}

function TimerReadout({ bank, step }: { bank: TimerBank; step: number }) {
  const t = useT();
  const layout = useLayout();
  const left = useTimerSeconds(bank, step);
  const clock = formatClock(left);
  return (
    <div data-timer-readout>
      <ProgressRing
        value={left / bank.totalSeconds(step)}
        tone="normal"
        size={layout === 'wide' ? 140 : 112}
        strokeWidth={10}
        label={t('Còn {{time}}', { time: clock })}
      >
        <span role="timer" className="text-2xl font-semibold">
          {clock}
        </span>
      </ProgressRing>
    </div>
  );
}

const START_LABELS: Record<TimerStatus, string> = {
  idle: 'Bắt đầu hẹn giờ',
  running: 'Tạm dừng',
  paused: 'Tiếp tục',
  done: 'Hẹn giờ lại',
};

function TimerControls({ bank, step }: { bank: TimerBank; step: number }) {
  const t = useT();
  const status = useTimerStatus(bank, step);
  const toggle = () => (status === 'running' ? bank.pause(step) : bank.start(step));
  return (
    <div className="flex items-center gap-2">
      <Button size="lg" leadingIcon={status === 'running' ? 'pause' : 'play'} onClick={toggle}>
        {t(START_LABELS[status])}
      </Button>
      <IconButton
        icon="arrows-clockwise"
        variant="outline"
        size="lg"
        label={t('Đặt lại')}
        onClick={() => bank.reset(step)}
      />
    </div>
  );
}
