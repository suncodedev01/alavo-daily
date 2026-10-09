import { describe, expect, it, vi } from 'vitest';

import {
  encodeUnderLimit,
  ENCODE_ATTEMPTS,
  fitWithin,
  isSmallEnough,
  MAX_PHOTO_CHARS,
  PhotoTooLarge,
} from './photoSize';

describe('fitWithin', () => {
  it('scales a landscape photo down to the longer side', () => {
    expect(fitWithin({ width: 4000, height: 3000 }, 1024)).toEqual({ width: 1024, height: 768 });
  });

  it('scales a portrait photo down to the longer side', () => {
    expect(fitWithin({ width: 3000, height: 4000 }, 1024)).toEqual({ width: 768, height: 1024 });
  });

  it('never makes a small photo bigger', () => {
    expect(fitWithin({ width: 800, height: 600 }, 1024)).toEqual({ width: 800, height: 600 });
    expect(fitWithin({ width: 1024, height: 1024 }, 1024)).toEqual({ width: 1024, height: 1024 });
  });

  it('keeps both sides at least one pixel for a very thin image', () => {
    expect(fitWithin({ width: 10000, height: 2 }, 1024)).toEqual({ width: 1024, height: 1 });
  });

  it('rounds to whole pixels', () => {
    const size = fitWithin({ width: 1001, height: 999 }, 500);
    expect(Number.isInteger(size.width) && Number.isInteger(size.height)).toBe(true);
  });
});

describe('isSmallEnough', () => {
  it('accepts a data URL up to the limit and rejects one past it', () => {
    expect(isSmallEnough('x'.repeat(MAX_PHOTO_CHARS))).toBe(true);
    expect(isSmallEnough('x'.repeat(MAX_PHOTO_CHARS + 1))).toBe(false);
  });
});

describe('encodeUnderLimit', () => {
  const small = 'data:image/jpeg;base64,AAAA';
  const big = 'x'.repeat(MAX_PHOTO_CHARS + 1);

  it('uses the preferred size and quality when that already fits', () => {
    const encode = vi.fn(() => small);
    expect(encodeUnderLimit(encode)).toBe(small);
    expect(encode).toHaveBeenCalledTimes(1);
    expect(encode).toHaveBeenCalledWith({ maxSide: 1024, quality: 0.8 });
  });

  it('falls back to smaller attempts until one fits', () => {
    const encode = vi.fn().mockReturnValueOnce(big).mockReturnValueOnce(big).mockReturnValue(small);
    expect(encodeUnderLimit(encode)).toBe(small);
    expect(encode).toHaveBeenCalledTimes(3);
    expect(encode).toHaveBeenLastCalledWith({ maxSide: 800, quality: 0.6 });
  });

  it('gives up with PhotoTooLarge when no attempt fits', () => {
    const encode = vi.fn(() => big);
    expect(() => encodeUnderLimit(encode)).toThrow(PhotoTooLarge);
    expect(encode).toHaveBeenCalledTimes(ENCODE_ATTEMPTS.length);
  });

  it('only gets smaller from one attempt to the next', () => {
    const sides = ENCODE_ATTEMPTS.map((attempt) => attempt.maxSide);
    const qualities = ENCODE_ATTEMPTS.map((attempt) => attempt.quality);
    expect(sides).toEqual([...sides].sort((a, b) => b - a));
    expect(qualities).toEqual([...qualities].sort((a, b) => b - a));
  });
});
