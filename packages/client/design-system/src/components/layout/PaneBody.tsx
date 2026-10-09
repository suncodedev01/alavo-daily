import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export type PageWidth = 'page' | 'detail' | 'form' | 'full';

const WIDTH_CLASS: Record<PageWidth, string> = {
  page: 'max-w-300',
  detail: 'max-w-160',
  form: 'max-w-110',
  full: 'max-w-none',
};

export type PageColumnProps = ComponentProps<'div'> & { maxWidth?: PageWidth };

export function PageColumn({ maxWidth = 'page', className, ...rest }: PageColumnProps) {
  return <div className={cn('mx-auto grid w-full gap-4', WIDTH_CLASS[maxWidth], className)} {...rest} />;
}

export type PaneBodyProps = ComponentProps<'div'> & { maxWidth?: PageWidth };

export function PaneBody({ maxWidth, className, children, ...rest }: PaneBodyProps) {
  return (
    <div className={cn('min-h-0 flex-1 overflow-y-auto pt-2 pr-6 pb-12 pl-4', className)} {...rest}>
      {maxWidth ? <PageColumn maxWidth={maxWidth}>{children}</PageColumn> : children}
    </div>
  );
}
