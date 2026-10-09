import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { toneForValue, type MeterTone } from './Meter';

export type ProgressRingProps = {
  value: number;
  size?: number;
  strokeWidth?: number;
  tone?: MeterTone;
  label?: string;
  children?: ReactNode;
  className?: string;
};

const STROKE_CLASS: Record<MeterTone, string> = {
  normal: 'stroke-chart-1',
  warn: 'stroke-meter-warn',
  over: 'stroke-meter-over',
};

export function ProgressRing({
  value,
  size = 188,
  strokeWidth = 16,
  tone,
  label,
  children,
  className,
}: ProgressRingProps) {
  const resolvedTone = tone ?? toneForValue(value);
  const clamped = Math.min(Math.max(0, value), 1);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(Math.max(0, value) * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('relative inline-grid place-items-center', className)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={center} cy={center} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-surface-tint" />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference * clamped} ${circumference}`}
          transform={`rotate(-90 ${center} ${center})`}
          className={cn('transition-all duration-300', STROKE_CLASS[resolvedTone])}
        />
      </svg>
      {children ? <div className="absolute text-center">{children}</div> : null}
    </div>
  );
}
