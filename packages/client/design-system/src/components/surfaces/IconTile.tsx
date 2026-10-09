import { cn } from '@/lib/utils';
import { Icon, type IconWeight } from '../foundations/Icon';

export type IconTileSize = 'sm' | 'md' | 'lg';
export type IconTileTone = 'neutral' | 'brand' | 'accent' | 'solid';

export type IconTileProps = {
  icon: string;
  size?: IconTileSize;
  tone?: IconTileTone;
  weight?: IconWeight;
  className?: string;
};

const SIZE_CLASS: Record<IconTileSize, string> = {
  sm: 'size-8 rounded-lg',
  md: 'size-9 rounded-lg',
  lg: 'size-12 rounded-xl',
};

const ICON_SIZE: Record<IconTileSize, number> = { sm: 16, md: 20, lg: 24 };

const TONE_CLASS: Record<IconTileTone, string> = {
  neutral: 'bg-surface-tint text-text-secondary',
  brand: 'bg-surface-brand text-cover-fg',
  accent: 'bg-accent text-accent-fg',
  solid: 'bg-brand-tile text-brand-tile-fg',
};

export function IconTile({ icon, size = 'md', tone = 'neutral', weight, className }: IconTileProps) {
  return (
    <span className={cn('grid shrink-0 place-items-center', SIZE_CLASS[size], TONE_CLASS[tone], className)}>
      <Icon name={icon} size={ICON_SIZE[size]} weight={weight} />
    </span>
  );
}
