import { describe, expect, it } from 'vitest';

import { shareText } from './shareText';

describe('shareText', () => {
  it('rounds a fraction to a whole percent', () => {
    expect(shareText(0.456)).toBe('46%');
    expect(shareText(1)).toBe('100%');
    expect(shareText(0)).toBe('0%');
  });

  it('shows a tiny but real share as under one percent', () => {
    expect(shareText(0.004)).toBe('<1%');
  });
});
