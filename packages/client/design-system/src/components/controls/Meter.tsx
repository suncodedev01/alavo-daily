import { cn } from '@/lib/utils';

export type MeterTone = 'normal' | 'warn' | 'over';

export const METER_WARN_THRESHOLD = 0.85;
export const METER_OVER_THRESHOLD = 1;

export type MeterProps = {
  value: number;
  tone?: MeterTone;
  label?: string;
  className?: string;
};

const FILL_CLASS: Record<MeterTone, string> = {
  normal: 'bg-meter-ok',
  warn: 'bg-meter-warn',
  over: 'bg-meter-over',
};

export function toneForValue(value: number): MeterTone {
  if (value > METER_OVER_THRESHOLD) return 'over';
  if (value >= METER_WARN_THRESHOLD) return 'warn';
  return 'normal';
}

export function Meter({ value, tone, label, className }: MeterProps) {
  const resolvedTone = tone ?? toneForValue(value);
  const percent = Math.round(Math.max(0, value) * 100);
  const fillWidth = `${Math.min(Math.max(0, value), 1) * 100}%`;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      data-tone={resolvedTone}
      className={cn('h-2 overflow-hidden rounded-full bg-surface-tint', className)}
    >
      <i
        className={cn('block h-full rounded-full transition-all duration-300', FILL_CLASS[resolvedTone])}
        style={{ width: fillWidth }}
      />
    </div>
  );
}
