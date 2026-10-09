import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PaneHeaderProps = {
  title: string;
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PaneHeader({ title, leading, actions, className }: PaneHeaderProps) {
  return (
    <header className={cn('flex h-12 shrink-0 items-center gap-2 pt-2 pr-6 pl-4', className)}>
      {leading}
      <h1 className="mr-auto min-w-0 truncate text-title font-semibold">{title}</h1>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
