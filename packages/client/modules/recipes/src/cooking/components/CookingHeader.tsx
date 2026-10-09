import { formatClock } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Icon, IconButton } from '@alavo-daily/design-system';

import type { AwakeState } from '../types';
import type { TimerBank } from '../logic/timerBank';
import { useRunningTimers } from '../hooks/useRunningTimers';

export interface CookingHeaderProps {
  name: string;
  servings: number;
  awake: AwakeState;
  stepNumber: number;
  stepCount: number;
  bank: TimerBank;
  stepIndex: number;
  onClose: () => void;
}

export function CookingHeader(props: CookingHeaderProps) {
  const t = useT();
  const { name, servings, awake, stepNumber, stepCount, bank, stepIndex, onClose } = props;
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 lg:px-6 lg:py-4">
      <IconButton icon="x" variant="outline" size="lg" label={t('Thoát chế độ nấu')} onClick={onClose} />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-title font-semibold">{name}</h1>
        <p className="line-clamp-2 text-xs text-text-muted">
          {`${awakeText(awake, t)} · ${t('{{count}} người', { count: servings })}`}
        </p>
      </div>
      <RunningChips bank={bank} stepIndex={stepIndex} />
      <p className="shrink-0 text-sm font-semibold">
        {t('Bước {{current}}/{{total}}', { current: stepNumber, total: stepCount })}
      </p>
    </header>
  );
}

function awakeText(awake: AwakeState, t: ReturnType<typeof useT>): string {
  if (awake === 'off') return t('Không giữ được màn hình sáng. Hãy tắt chế độ ngủ của máy.');
  return t('Màn hình luôn sáng khi đang nấu');
}

function RunningChips({ bank, stepIndex }: { bank: TimerBank; stepIndex: number }) {
  const t = useT();
  const running = useRunningTimers(bank, stepIndex);
  return (
    <ul data-timer-readout aria-label={t('Hẹn giờ đang chạy')} className="flex shrink-0 gap-2 empty:hidden max-lg:order-last max-lg:basis-full max-lg:flex-wrap">
      {running.map(({ step, seconds }) => (
        <li
          key={step}
          className="inline-flex items-center gap-1 rounded-4xl bg-accent px-3 py-1 text-xs font-medium text-accent-fg"
        >
          <Icon name="timer" />
          {t('Bước {{number}} · {{time}}', { number: step + 1, time: formatClock(seconds) })}
        </li>
      ))}
    </ul>
  );
}
