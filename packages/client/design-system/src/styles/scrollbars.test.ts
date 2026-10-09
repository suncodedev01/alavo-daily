import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'index.css'), 'utf8');

describe('scrollbars', () => {
  it('are hidden everywhere so they never shift the layout', () => {
    expect(css).toMatch(/\*\s*\{[^}]*scrollbar-width:\s*none/);
    expect(css).toMatch(/\*::-webkit-scrollbar\s*\{\s*display:\s*none/);
  });

  it('can be switched back on where a screen needs one', () => {
    expect(css).toMatch(/@utility scrollbar-visible/);
  });
});
