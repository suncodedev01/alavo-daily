import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

export type SegmentedOption = { value: string; label: string };

export type SegmentedProps = {
  options: readonly SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
};

const ITEM_CLASS =
  'focus-ring min-h-8 min-w-0 rounded-4xl px-4 py-1 text-center text-sm leading-tight font-medium text-balance wrap-anywhere text-text-secondary aria-checked:bg-surface aria-checked:text-text-primary aria-checked:shadow-raised max-lg:min-h-11 max-lg:px-2';

function nextIndex(key: string, current: number, count: number): number | null {
  if (key === 'ArrowRight' || key === 'ArrowDown') return (current + 1) % count;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (current - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

export function Segmented({ options, value, onChange, label, className }: SegmentedProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === value));

  const handleKeyDown = (event: KeyboardEvent, index: number) => {
    const target = nextIndex(event.key, index, options.length);
    const option = target === null ? undefined : options[target];
    if (!option) return;
    event.preventDefault();
    onChange(option.value);
    refs.current[target as number]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-grid max-w-full auto-cols-[minmax(0,1fr)] grid-flow-col rounded-4xl bg-surface-tint p-1', className)}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={index === activeIndex ? 0 : -1}
          className={ITEM_CLASS}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
