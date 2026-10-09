import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '../foundations/Icon';

export type PillProps = Omit<ComponentProps<'button'>, 'type'> & {
  selected?: boolean;
  leadingIcon?: string;
};

const PILL_CLASS =
  'focus-ring inline-flex h-7 shrink-0 items-center gap-1.5 rounded-4xl bg-surface-tint px-3 text-row font-medium whitespace-nowrap text-text-secondary hover:bg-line-hairline aria-pressed:bg-accent aria-pressed:text-accent-fg disabled:opacity-50 max-lg:relative max-lg:h-9 max-lg:px-4 max-lg:text-sm max-lg:after:absolute max-lg:after:inset-x-0 max-lg:after:-inset-y-1 max-lg:after:content-[""]';

export function Pill({ selected = false, leadingIcon, className, children, ...rest }: PillProps) {
  return (
    <button type="button" aria-pressed={selected} className={cn(PILL_CLASS, className)} {...rest}>
      {leadingIcon ? <Icon name={leadingIcon} /> : null}
      {children}
    </button>
  );
}
