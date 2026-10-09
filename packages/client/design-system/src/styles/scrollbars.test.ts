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

describe('page scrolling', () => {
  it('is locked for the app shell so only the content inside scrolls', () => {
    expect(css).toMatch(/html\[data-shell\],\s*html\[data-shell\] body\s*\{[^}]*overflow:\s*hidden/);
    expect(css).toMatch(/html\[data-shell\] #root\s*\{[^}]*position:\s*fixed/);
  });

  it('does not touch pages that are not the app shell', () => {
    expect(css).not.toMatch(/(^|\n)\s*(html|body)\s*\{[^}]*overflow:\s*hidden/);
  });
});
