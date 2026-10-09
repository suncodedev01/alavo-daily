import { cn } from '@/lib/utils';
import { Sticker } from './Sticker';
import { stickerFor, type StickerKind, type StickerTone } from './stickerCatalog';

export type StickerTileSize = 'sm' | 'md' | 'lg';

export type StickerTileProps = {
  icon: string;
  kind: StickerKind;
  size?: StickerTileSize;
  label?: string;
  className?: string;
};

const SIZE_CLASS: Record<StickerTileSize, string> = { sm: 'size-8', md: 'size-9', lg: 'size-12' };

const STICKER_SIZE: Record<StickerTileSize, number> = { sm: 22, md: 24, lg: 32 };

const TONE_CLASS: Record<StickerTone, string> = {
  orange: 'sticker-tone-orange',
  blue: 'sticker-tone-blue',
  pink: 'sticker-tone-pink',
  purple: 'sticker-tone-purple',
  red: 'sticker-tone-red',
  teal: 'sticker-tone-teal',
  green: 'sticker-tone-green',
  brown: 'sticker-tone-brown',
  gold: 'sticker-tone-gold',
};

export function StickerTile({ icon, kind, size = 'md', label, className }: StickerTileProps) {
  const { sticker, tone } = stickerFor(icon, kind);
  return (
    <span
      className={cn(
        'sticker-wash grid shrink-0 place-items-center rounded-full',
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        className,
      )}
    >
      <Sticker name={sticker} size={STICKER_SIZE[size]} label={label} />
    </span>
  );
}
