import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '../foundations/Icon';

export type TabBarProps = {
  label?: string;
  children: ReactNode;
  className?: string;
};

export function TabBar({ label = 'Điều hướng', children, className }: TabBarProps) {
  return (
    <nav aria-label={label} className={cn('pb-safe shrink-0 border-t border-line-hairline bg-surface', className)}>
      <div className="grid auto-cols-fr grid-flow-col items-start px-2 pt-2 pb-2">{children}</div>
    </nav>
  );
}

export type TabBarItemProps = Omit<ComponentProps<'button'>, 'children'> & {
  icon: string;
  label: string;
  active?: boolean;
};

export function TabBarItem({ icon, label, active = false, className, ...rest }: TabBarItemProps) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      className={cn(
        'focus-ring group grid min-h-12 justify-items-center gap-0.5 py-1.5 text-meta font-medium',
        active ? 'text-accent-fg' : 'text-text-muted',
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          'grid h-8 w-14 place-items-center rounded-2xl transition-colors',
          active ? 'bg-accent' : 'group-hover:bg-surface-tint',
        )}
      >
        <Icon name={icon} size={24} />
      </span>
      <span>{label}</span>
    </button>
  );
}

export type TabBarActionProps = Omit<ComponentProps<'button'>, 'children'> & {
  icon: string;
  label: string;
  showLabel?: boolean;
  active?: boolean;
};

export function TabBarAction({
  icon,
  label,
  showLabel = false,
  active = false,
  className,
  ...rest
}: TabBarActionProps) {
  const filled = active && showLabel;
  return (
    <button
      type="button"
      aria-label={showLabel ? undefined : label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'focus-ring grid min-h-12 justify-items-center gap-0.5 text-meta font-medium',
        showLabel ? '-mt-3.5 p-0' : '-mt-0.5',
        active ? 'text-accent-fg' : 'text-text-muted',
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          'grid size-13 place-items-center rounded-full bg-primary text-primary-fg shadow-raised transition-colors hover:bg-primary-hover',
          filled && 'ring-4 ring-accent',
        )}
      >
        <Icon name={icon} size={24} weight={filled ? 'fill' : 'regular'} />
      </span>
      {showLabel ? <span>{label}</span> : null}
    </button>
  );
}
