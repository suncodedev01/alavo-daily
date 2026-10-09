import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { DEFAULT_TEXTS, useDesignSystemTexts } from '../../lib/texts';

export type Status = 'open' | 'working' | 'needs_you' | 'your_call' | 'resolved';

export const DEFAULT_STATUS_LABELS: Record<Status, string> = DEFAULT_TEXTS.status;

export type StatusChipProps = {
  status: Status;
  label?: string;
  labels?: Partial<Record<Status, string>>;
  children?: ReactNode;
  className?: string;
};

const STATUS_CLASS: Record<Status, string> = {
  open: 'border-line-strong bg-surface-tint text-text-secondary',
  working: 'border-click-300 bg-accent text-accent-fg',
  needs_you: 'border-hold-edge bg-hold-bg text-hold-fg',
  your_call: 'border-hold-edge bg-surface text-hold-fg',
  resolved: 'border-mint-500 bg-wash-mint text-mint-fg',
};

export function StatusChip({ status, label, labels, children, className }: StatusChipProps) {
  const texts = useDesignSystemTexts();
  const text = children ?? label ?? labels?.[status] ?? texts.status[status];
  return (
    <span
      data-status={status}
      className={cn(
        'inline-flex h-5 items-center rounded-sm border px-1.5 text-micro font-semibold tracking-label whitespace-nowrap uppercase',
        STATUS_CLASS[status],
        className,
      )}
    >
      {text}
    </span>
  );
}
