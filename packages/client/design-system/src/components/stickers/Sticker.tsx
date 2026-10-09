import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import type { StickerName } from './stickerNames';
import { STICKER_URLS } from './stickerUrls';

const DEFAULT_SIZE = 24;

export type StickerProps = Omit<ComponentProps<'img'>, 'src' | 'alt' | 'width' | 'height'> & {
  name: StickerName;
  size?: number;
  label?: string;
};

export function Sticker({ name, size = DEFAULT_SIZE, label, className, ...rest }: StickerProps) {
  return (
    <img
      src={STICKER_URLS[name]}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
      draggable={false}
      data-sticker={name}
      className={cn('inline-block shrink-0 select-none', className)}
      {...rest}
    />
  );
}
