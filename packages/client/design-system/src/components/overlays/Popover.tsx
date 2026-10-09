import type { ReactElement, ReactNode } from 'react';
import { Popover as VendorPopover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Alignment, Placement } from './Menu';

export type PopoverProps = {
  trigger: ReactElement;
  placement?: Placement;
  align?: Alignment;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  label?: string;
  children: ReactNode;
  className?: string;
};

const CONTENT_CLASS =
  'max-h-(--available-height) max-w-(--available-width) w-auto min-w-60 gap-0 overflow-y-auto rounded-lg bg-surface p-1 text-sm text-text-primary shadow-overlay ring-0 dark:ring-0';

export function Popover({
  trigger,
  placement = 'bottom',
  align = 'start',
  open,
  defaultOpen,
  onOpenChange,
  label,
  children,
  className,
}: PopoverProps) {
  return (
    <VendorPopover open={open} defaultOpen={defaultOpen} onOpenChange={(next) => onOpenChange?.(next)}>
      <PopoverTrigger render={trigger} />
      <PopoverContent side={placement} align={align} aria-label={label} className={cn(CONTENT_CLASS, className)}>
        {children}
      </PopoverContent>
    </VendorPopover>
  );
}
