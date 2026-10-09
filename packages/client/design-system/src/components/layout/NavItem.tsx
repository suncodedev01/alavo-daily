import type { ComponentProps, ReactElement } from 'react';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '@/lib/utils';
import { Icon } from '../foundations/Icon';

export type NavItemProps = Omit<ComponentProps<'button'>, 'children'> & {
  icon: string;
  label: string;
  count?: number | string;
  active?: boolean;
  render?: ReactElement;
};

const ITEM_CLASS =
  'focus-ring flex h-9 w-full items-center gap-2.5 rounded-4xl px-3 text-left text-sm font-medium text-text-secondary hover:bg-surface-tint max-compact:justify-center max-compact:px-0';

const ACTIVE_CLASS = 'bg-accent text-accent-fg hover:bg-accent';

export function NavItem({ icon, label, count, active = false, render, className, ...rest }: NavItemProps) {
  const content = (
    <>
      <Icon name={icon} size="lg" />
      <span className="min-w-0 flex-1 truncate max-compact:sr-only">{label}</span>
      {count !== undefined ? (
        <span
          className={cn(
            'ml-auto text-xs font-normal max-compact:hidden',
            active ? 'text-accent-fg' : 'text-text-muted',
          )}
        >
          {count}
        </span>
      ) : null}
    </>
  );
  return useRender({
    defaultTagName: 'button',
    render,
    props: {
      type: render ? undefined : 'button',
      'aria-current': active ? 'page' : undefined,
      className: cn(ITEM_CLASS, active && ACTIVE_CLASS, className),
      children: content,
      ...rest,
    },
  });
}
