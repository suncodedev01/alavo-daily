import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useDesignSystemTexts } from '../../lib/texts';
import { Eyebrow } from '../surfaces/Eyebrow';
import { FloatingCard } from '../surfaces/FloatingCard';

export type SidebarProps = {
  header?: ReactNode;
  footer?: ReactNode;
  label?: string;
  children: ReactNode;
  className?: string;
};

export function Sidebar({ header, footer, label, children, className }: SidebarProps) {
  const texts = useDesignSystemTexts();
  return (
    <FloatingCard
      as="aside"
      tone="raised"
      className={cn('mr-0 flex w-64 flex-none flex-col max-compact:w-14', className)}
    >
      {header}
      <nav aria-label={label ?? texts.navigation} className="flex-1 overflow-y-auto px-2 pt-1 pb-2">
        {children}
      </nav>
      {footer}
    </FloatingCard>
  );
}

export function SidebarHeader({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('flex h-10 shrink-0 items-center gap-2 pr-2 pl-3', className)} {...rest} />;
}

export type SidebarGroupProps = { label?: string; children: ReactNode; className?: string };

export function SidebarGroup({ label, children, className }: SidebarGroupProps) {
  return (
    <div className={cn('mt-4 first:mt-0', className)}>
      {label ? (
        <Eyebrow as="div" className="block px-3 pb-2 max-compact:hidden">
          {label}
        </Eyebrow>
      ) : null}
      <div className="grid gap-0.5">{children}</div>
    </div>
  );
}

export function SidebarSeparator() {
  return <div role="separator" className="mx-3 my-3 h-px bg-line-hairline" />;
}

export function SidebarFooter({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('flex shrink-0 items-center gap-2.5 p-2', className)} {...rest} />;
}
