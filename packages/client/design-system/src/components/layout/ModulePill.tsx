import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '../foundations/Icon';
import { StickerTile } from '../stickers/StickerTile';

export type ModulePillVariant = 'chip' | 'row';

export type ModulePillProps = Omit<ComponentProps<'button'>, 'children'> & {
  icon: string;
  name: string;
  variant?: ModulePillVariant;
};

const VARIANT_CLASS: Record<ModulePillVariant, string> = {
  chip: 'h-11 gap-2 rounded-full bg-surface pr-3 pl-1.5 text-sm font-semibold shadow-hairline',
  row: 'h-10 w-full gap-2 rounded-lg pr-2 pl-3 text-left text-sm font-semibold hover:bg-surface-tint',
};

const TILE_SIZE: Record<ModulePillVariant, 'sm'> = { chip: 'sm', row: 'sm' };

export function ModulePill({ icon, name, variant = 'chip', className, ...rest }: ModulePillProps) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      className={cn('focus-ring inline-flex items-center text-text-primary', VARIANT_CLASS[variant], className)}
      {...rest}
    >
      <StickerTile icon={icon} kind="module" size={TILE_SIZE[variant]} />
      <span className="min-w-0 truncate">{name}</span>
      <Icon name="caret-down" className={cn('text-text-muted', variant === 'row' && 'ml-auto')} />
    </button>
  );
}
