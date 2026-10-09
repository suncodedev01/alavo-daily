import { STICKER_NAMES, type StickerName } from './stickerNames';

const MODULES = import.meta.glob<string>('../../assets/emoji/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

function urlOf(name: StickerName): string {
  return MODULES[`../../assets/emoji/${name}.svg`] ?? '';
}

export const STICKER_URLS: Readonly<Record<StickerName, string>> = Object.fromEntries(
  STICKER_NAMES.map((name) => [name, urlOf(name)]),
) as Record<StickerName, string>;
