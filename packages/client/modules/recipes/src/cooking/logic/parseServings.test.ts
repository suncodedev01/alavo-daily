import { describe, expect, it } from 'vitest';

import { parseServings } from './parseServings';

describe('parseServings', () => {
  it('reads a whole number', () => {
    expect(parseServings('6', 2)).toBe(6);
  });

  it('falls back when missing or not a number', () => {
    expect(parseServings(null, 2)).toBe(2);
    expect(parseServings('many', 3)).toBe(3);
  });

  it('keeps the value between 1 and 50', () => {
    expect(parseServings('0', 2)).toBe(1);
    expect(parseServings('500', 2)).toBe(50);
  });
});
