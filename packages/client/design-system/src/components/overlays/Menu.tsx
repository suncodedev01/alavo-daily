import type { ReactElement, ReactNode } from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { cn } from '@/lib/utils';
import { Icon } from '../foundations/Icon';

export type Placement = 'top' | 'bottom';
export type Alignment = 'start' | 'center' | 'end';

export type MenuProps = {
  trigger: ReactElement;
  placement?: Placement;
  align?: Alignment;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
};

const POPUP_CLASS =
  'max-h-(--available-height) min-w-60 origin-(--transform-origin) overflow-y-auto rounded-lg bg-surface p-1 text-text-primary shadow-overlay outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none';

export function Menu({
  trigger,
  placement = 'bottom',
  align = 'start',
  open,
  defaultOpen,
  onOpenChange,
  children,
  className,
}: MenuProps) {
  return (
    <MenuPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={(next) => onOpenChange?.(next)}>
      <MenuPrimitive.Trigger render={trigger} />
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner side={placement} align={align} sideOffset={4} className="z-50 outline-none">
          <MenuPrimitive.Popup className={cn(POPUP_CLASS, className)}>{children}</MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}

export type MenuItemProps = {
  icon?: string;
  hint?: string;
  selected?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  children: ReactNode;
  className?: string;
};

const ITEM_CLASS =
  'flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-md px-3 text-left text-sm outline-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:not-aria-checked:bg-surface-tint aria-checked:bg-accent aria-checked:text-accent-fg';

export function MenuItem({
  icon,
  hint,
  selected,
  destructive = false,
  disabled,
  onSelect,
  children,
  className,
}: MenuItemProps) {
  const radioProps = selected === undefined ? {} : { role: 'menuitemradio', 'aria-checked': selected };
  return (
    <MenuPrimitive.Item
      disabled={disabled}
      onClick={onSelect}
      className={cn(ITEM_CLASS, destructive && 'text-destructive-fg', className)}
      {...radioProps}
    >
      {icon ? <Icon name={icon} size="lg" /> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint ? <span className="ml-auto text-xs whitespace-nowrap text-text-muted">{hint}</span> : null}
    </MenuPrimitive.Item>
  );
}

export function MenuSeparator({ className }: { className?: string }) {
  return <MenuPrimitive.Separator className={cn('mx-1 my-1 h-px bg-line-hairline', className)} />;
}

export function MenuLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="presentation" className={cn('eyebrow block px-3 pt-2 pb-1', className)}>
      {children}
    </div>
  );
}
