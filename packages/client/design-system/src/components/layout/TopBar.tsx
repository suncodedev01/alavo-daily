import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type TopBarProps = {
  leading?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function TopBar({ leading, children, className }: TopBarProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {leading}
      <span className="flex-1" />
      {children}
    </div>
  );
}
