import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export type EyebrowProps = Omit<ComponentProps<'span'>, 'ref'> & { as?: 'span' | 'p' | 'div' | 'h2' | 'h3' };

export function Eyebrow({ as: Tag = 'span', className, ...rest }: EyebrowProps) {
  return <Tag className={cn('eyebrow', className)} {...rest} />;
}
