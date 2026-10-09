import type { ReactNode } from 'react';
import { Collapsible as CollapsibleRoot, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Icon } from '../foundations/Icon';

export type ContextSectionProps = {
  title: string;
  trailing?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
};

const TRIGGER_CLASS =
  'focus-ring-inset group/trigger flex h-10 w-full max-lg:h-11 items-center gap-2 px-4 text-left text-sm font-semibold text-text-primary';

export function ContextSection({
  title,
  trailing,
  open,
  defaultOpen,
  onOpenChange,
  children,
  className,
}: ContextSectionProps) {
  return (
    <CollapsibleRoot
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      className={cn('not-first:border-t not-first:border-line-hairline', className)}
    >
      <CollapsibleTrigger className={TRIGGER_CLASS}>
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {trailing}
        <Icon
          name="caret-down"
          className="text-text-muted transition-transform group-data-panel-open/trigger:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">{children}</CollapsibleContent>
    </CollapsibleRoot>
  );
}

export { ContextSection as Collapsible };
