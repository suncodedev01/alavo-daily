import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export type FloatingCardTone = 'surface' | 'raised';
export type FloatingCardElement = 'div' | 'aside' | 'nav' | 'section';

export type FloatingCardProps = ComponentProps<'div'> & {
  as?: FloatingCardElement;
  tone?: FloatingCardTone;
};

const TONE_CLASS: Record<FloatingCardTone, string> = {
  surface: 'bg-surface',
  raised: 'bg-surface-raised',
};

export function FloatingCard({ as: Tag = 'div', tone = 'surface', className, ...rest }: FloatingCardProps) {
  return (
    <Tag
      className={cn('m-2 overflow-hidden rounded-lg shadow-card', TONE_CLASS[tone], className)}
      {...rest}
    />
  );
}
