import type { EncodeAttempt, Size } from '../types';

export const MAX_PHOTO_CHARS = 400 * 1024;

/** The first attempt is the preferred size and quality; the rest only run when it is too big. */
export const ENCODE_ATTEMPTS: readonly EncodeAttempt[] = [
  { maxSide: 1024, quality: 0.8 },
  { maxSide: 1024, quality: 0.65 },
  { maxSide: 800, quality: 0.6 },
  { maxSide: 640, quality: 0.5 },
];

export class PhotoTooLarge extends Error {}

export class PhotoUnreadable extends Error {}

/** Scales `size` down so its longer side is at most `maxSide`. A smaller image is left alone. */
export function fitWithin(size: Size, maxSide: number): Size {
  const longest = Math.max(size.width, size.height);
  if (longest <= maxSide) return { width: size.width, height: size.height };
  const ratio = maxSide / longest;
  return {
    width: Math.max(1, Math.round(size.width * ratio)),
    height: Math.max(1, Math.round(size.height * ratio)),
  };
}

export function isSmallEnough(dataUrl: string): boolean {
  return dataUrl.length <= MAX_PHOTO_CHARS;
}

/** Tries each attempt in order and returns the first encoding the engine accepts. */
export function encodeUnderLimit(encode: (attempt: EncodeAttempt) => string): string {
  for (const attempt of ENCODE_ATTEMPTS) {
    const dataUrl = encode(attempt);
    if (isSmallEnough(dataUrl)) return dataUrl;
  }
  throw new PhotoTooLarge();
}
