import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { IconTile } from '../surfaces/IconTile';

export type EmptyStateProps = {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-8 text-center', className)}>
      <IconTile icon={icon} size="lg" />
      <h3 className="text-title font-semibold text-text-primary">{title}</h3>
      {description ? <p className="max-w-80 text-sm text-text-muted">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
