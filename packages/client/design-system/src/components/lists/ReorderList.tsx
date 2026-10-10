import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { IconButton } from '../controls/IconButton';
import { moveItem } from './reorder';

export type ReorderItem = {
  id: string;
  label: string;
  /** A sticker or icon tile shown before the label. */
  leading?: ReactNode;
};

export type ReorderListProps = {
  items: readonly ReorderItem[];
  onChange: (ids: string[]) => void;
  /** Draws a divider after this many items, for a list whose first items are shown somewhere else. */
  dividerAfter?: number;
  /** Heading drawn on the divider. */
  dividerLabel?: string;
  moveUpLabel: (label: string) => string;
  moveDownLabel: (label: string) => string;
  disabled?: boolean;
  className?: string;
};

/** A list the person puts in order with up and down buttons, so it works with keyboard and touch. */
export function ReorderList({
  items,
  onChange,
  dividerAfter,
  dividerLabel,
  moveUpLabel,
  moveDownLabel,
  disabled = false,
  className,
}: ReorderListProps) {
  const ids = items.map((item) => item.id);
  const move = (from: number, to: number) => onChange(moveItem(ids, from, to));
  return (
    <ol className={cn('grid', className)}>
      {items.map((item, index) => (
        <li key={item.id} className="grid">
          {index === dividerAfter ? <Divider label={dividerLabel} /> : null}
          <div className="flex min-h-12 items-center gap-3 py-1">
            <span aria-hidden className="w-5 shrink-0 text-center text-sm text-text-muted">
              {index + 1}
            </span>
            {item.leading}
            <span className="min-w-0 flex-1 truncate text-row font-medium">{item.label}</span>
            <IconButton
              icon="caret-up"
              label={moveUpLabel(item.label)}
              size="sm"
              disabled={disabled || index === 0}
              onClick={() => move(index, index - 1)}
            />
            <IconButton
              icon="caret-down"
              label={moveDownLabel(item.label)}
              size="sm"
              disabled={disabled || index === items.length - 1}
              onClick={() => move(index, index + 1)}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

function Divider({ label }: { label?: string }) {
  return (
    <div role="separator" className="flex items-center gap-2 py-2 text-meta text-text-muted">
      <span className="h-px flex-1 bg-line-hairline" />
      {label ? <span>{label}</span> : null}
      <span className="h-px flex-1 bg-line-hairline" />
    </div>
  );
}
