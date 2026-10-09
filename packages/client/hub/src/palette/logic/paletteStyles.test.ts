import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { DEFAULT_PALETTE_ID, PALETTES } from './palettes';

const STYLES_DIR = resolve(__dirname, '../../../../design-system/src/styles');
const baseCss = readFileSync(resolve(STYLES_DIR, 'index.css'), 'utf8');
const paletteCss = readFileSync(resolve(STYLES_DIR, 'palettes.css'), 'utf8');

type Tokens = Record<string, string>;
type Mode = 'light' | 'dark';

function blockAfter(css: string, selector: string): string | null {
  const start = css.indexOf(selector);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  return css.slice(open + 1, css.indexOf('}', open));
}

function readTokens(block: string | null): Tokens {
  const tokens: Tokens = {};
  for (const match of (block ?? '').matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    tokens[match[1]!] = match[2]!.trim();
  }
  return tokens;
}

function paletteSelector(id: string, mode: Mode): string {
  return mode === 'light' ? `:root[data-palette="${id}"] {` : `:root[data-palette="${id}"][data-theme="dark"] {`;
}

function resolveTokens(id: string, mode: Mode): Tokens {
  const light = readTokens(blockAfter(baseCss, '\n:root {'));
  const base = mode === 'light' ? light : { ...light, ...readTokens(blockAfter(baseCss, ':root[data-theme="dark"]')) };
  if (id === DEFAULT_PALETTE_ID) return base;
  const lightOverrides = readTokens(blockAfter(paletteCss, paletteSelector(id, 'light')));
  const darkOverrides = mode === 'dark' ? readTokens(blockAfter(paletteCss, paletteSelector(id, 'dark'))) : {};
  return { ...base, ...lightOverrides, ...darkOverrides };
}

function resolveColor(tokens: Tokens, name: string): string {
  let value = tokens[name];
  for (let depth = 0; depth < 8 && value; depth += 1) {
    const reference = /^var\((--[a-z0-9-]+)\)$/.exec(value);
    if (!reference) break;
    value = tokens[reference[1]!];
  }
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${name} is not a plain colour: ${value}`);
  return value;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => {
    const value = parseInt(hex.slice(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrast(tokens: Tokens, foreground: string, background: string): number {
  const first = luminance(resolveColor(tokens, foreground));
  const second = luminance(resolveColor(tokens, background));
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const TEXT_PAIRS: [string, string][] = [
  ['--text-primary', '--paper'],
  ['--text-primary', '--surface'],
  ['--text-muted', '--surface'],
  ['--on-brand', '--brand'],
];

const NON_DEFAULT = PALETTES.filter((palette) => palette.id !== DEFAULT_PALETTE_ID);

describe('palette styles', () => {
  it('has a light and a dark block for every palette except the default', () => {
    for (const palette of NON_DEFAULT) {
      expect(paletteCss, palette.id).toContain(paletteSelector(palette.id, 'light'));
      expect(paletteCss, palette.id).toContain(paletteSelector(palette.id, 'dark'));
    }
  });

  it('has no block for a palette the data does not list', () => {
    const ids = [...paletteCss.matchAll(/:root\[data-palette="([a-z]+)"\] \{/g)].map((match) => match[1]);
    expect([...ids].sort()).toEqual(NON_DEFAULT.map((palette) => palette.id).sort());
  });

  it('lets a palette override the base brand colour in both themes', () => {
    expect(resolveTokens('kim', 'light')['--brand']).toBe('#5D7692');
    expect(resolveTokens('kim', 'dark')['--paper']).toBe('#0F1214');
    expect(resolveTokens(DEFAULT_PALETTE_ID, 'light')['--brand']).toBe('var(--click-400)');
  });

  it('keeps the default palette on the base tokens', () => {
    expect(paletteCss).not.toContain(`data-palette="${DEFAULT_PALETTE_ID}"`);
  });
});

describe.each(PALETTES.flatMap((palette) => (['light', 'dark'] as const).map((mode) => [palette.id, mode] as const)))(
  'text contrast of palette %s in the %s theme',
  (id, mode) => {
    it.each(TEXT_PAIRS)('keeps %s readable on %s', (foreground, background) => {
      expect(contrast(resolveTokens(id, mode), foreground, background)).toBeGreaterThanOrEqual(4.5);
    });
  },
);
