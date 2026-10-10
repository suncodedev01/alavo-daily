import type { StickerName } from './stickerNames';

export type StickerTone =
  | 'orange'
  | 'blue'
  | 'pink'
  | 'purple'
  | 'red'
  | 'teal'
  | 'green'
  | 'brown'
  | 'gold';

export type StickerKind = 'category' | 'wallet' | 'module' | 'recipe';

export type StickerChoice = { sticker: StickerName; tone: StickerTone };

const ICON_STICKERS: Readonly<Record<string, StickerChoice>> = {
  'fork-knife': { sticker: 'steaming_bowl', tone: 'orange' },
  'cooking-pot': { sticker: 'pot_of_food', tone: 'orange' },
  coffee: { sticker: 'hot_beverage', tone: 'orange' },
  fire: { sticker: 'fire', tone: 'orange' },
  timer: { sticker: 'timer_clock', tone: 'orange' },
  car: { sticker: 'automobile', tone: 'blue' },
  'device-mobile': { sticker: 'mobile_phone', tone: 'blue' },
  'phone-call': { sticker: 'mobile_phone', tone: 'blue' },
  desktop: { sticker: 'desktop_computer', tone: 'blue' },
  laptop: { sticker: 'desktop_computer', tone: 'blue' },
  'airplane-tilt': { sticker: 'airplane', tone: 'blue' },
  receipt: { sticker: 'receipt', tone: 'blue' },
  drop: { sticker: 'receipt', tone: 'blue' },
  link: { sticker: 'link', tone: 'blue' },
  'wifi-high': { sticker: 'link', tone: 'blue' },
  compass: { sticker: 'compass', tone: 'blue' },
  'shopping-bag': { sticker: 'shopping_bags', tone: 'pink' },
  't-shirt': { sticker: 't_shirt', tone: 'pink' },
  gift: { sticker: 'wrapped_gift', tone: 'pink' },
  heart: { sticker: 'red_heart', tone: 'pink' },
  'heart-fill': { sticker: 'red_heart', tone: 'pink' },
  'film-strip': { sticker: 'clapper_board', tone: 'purple' },
  'game-controller': { sticker: 'video_game', tone: 'purple' },
  'book-open': { sticker: 'open_book', tone: 'purple' },
  'graduation-cap': { sticker: 'graduation_cap', tone: 'purple' },
  heartbeat: { sticker: 'stethoscope', tone: 'red' },
  'first-aid-kit': { sticker: 'pill', tone: 'red' },
  'house-line': { sticker: 'house', tone: 'teal' },
  house: { sticker: 'house_with_garden', tone: 'teal' },
  wrench: { sticker: 'wrench', tone: 'teal' },
  'calendar-blank': { sticker: 'calendar', tone: 'teal' },
  repeat: { sticker: 'counterclockwise_arrows_button', tone: 'teal' },
  gear: { sticker: 'gear', tone: 'teal' },
  'arrow-down-left': { sticker: 'money_bag', tone: 'green' },
  coins: { sticker: 'money_bag', tone: 'green' },
  checks: { sticker: 'check_mark_button', tone: 'green' },
  trophy: { sticker: 'check_mark_button', tone: 'green' },
  lightning: { sticker: 'high_voltage', tone: 'gold' },
  wallet: { sticker: 'credit_card', tone: 'gold' },
  'credit-card': { sticker: 'credit_card', tone: 'gold' },
  bank: { sticker: 'bank', tone: 'blue' },
  money: { sticker: 'dollar_banknote', tone: 'green' },
  'piggy-bank': { sticker: 'pig_face', tone: 'gold' },
  target: { sticker: 'bullseye', tone: 'gold' },
  'push-pin': { sticker: 'pushpin', tone: 'gold' },
  umbrella: { sticker: 'pushpin', tone: 'gold' },
  bell: { sticker: 'bell', tone: 'gold' },
  'bell-ringing': { sticker: 'bell', tone: 'gold' },
  tag: { sticker: 'label', tone: 'brown' },
  'paw-print': { sticker: 'paw_prints', tone: 'brown' },
};

const FALLBACK_STICKERS: Readonly<Record<StickerKind, StickerChoice>> = {
  category: { sticker: 'label', tone: 'brown' },
  wallet: { sticker: 'credit_card', tone: 'gold' },
  module: { sticker: 'pushpin', tone: 'gold' },
  recipe: { sticker: 'pot_of_food', tone: 'orange' },
};

export const STICKER_ICON_NAMES: readonly string[] = Object.keys(ICON_STICKERS);

export function hasSticker(iconName: string): boolean {
  return Object.hasOwn(ICON_STICKERS, iconName);
}

export function stickerFor(iconName: string, kind: StickerKind): StickerChoice {
  return (hasSticker(iconName) ? ICON_STICKERS[iconName] : undefined) ?? FALLBACK_STICKERS[kind];
}
