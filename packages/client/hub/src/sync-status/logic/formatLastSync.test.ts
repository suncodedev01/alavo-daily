import { describe, expect, it } from 'vitest';

import { formatLastSync } from './formatLastSync';

const keyAsText = (key: string, values?: Record<string, string | number>) =>
  values ? key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values[name])) : key;

describe('formatLastSync', () => {
  const sync = new Date(2026, 9, 9, 13, 5).getTime();

  it('gives only the time for today', () => {
    const later = new Date(2026, 9, 9, 18, 0).getTime();
    expect(formatLastSync(sync, keyAsText, later)).toBe('Lúc 13:05');
  });

  it('adds the day for an earlier day', () => {
    const nextDay = new Date(2026, 9, 10, 8, 0).getTime();
    expect(formatLastSync(sync, keyAsText, nextDay)).toBe('09/10 lúc 13:05');
  });
});
