import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export type CardProps = ComponentProps<'section'> & { padding?: CardPadding };

const PADDING_CLASS: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-4 lg:p-6',
  lg: 'p-6',
};

export function Card({ padding = 'md', className, ...rest }: CardProps) {
  return (
    <section
      className={cn('rounded-xl bg-surface text-text-primary shadow-card', PADDING_CLASS[padding], className)}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('mb-4 flex flex-wrap items-center justify-between gap-x-2 gap-y-3', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: ComponentProps<'h2'>) {
  return <h2 className={cn('min-w-0 text-title font-semibold', className)} {...rest} />;
}

export function CardBody({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('text-sm text-text-secondary', className)} {...rest} />;
}
