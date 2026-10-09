import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'index.css'), 'utf8');

type Tokens = Record<string, string>;

function blockAfter(selector: string): string {
  const start = css.indexOf(selector);
  const open = css.indexOf('{', start);
  const close = css.indexOf('\n}', open);
  return css.slice(open + 1, close);
}

function readTokens(block: string): Tokens {
  const tokens: Tokens = {};
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    tokens[match[1]!] = match[2]!.trim();
  }
  return tokens;
}

const light = readTokens(blockAfter('\n:root {'));
const dark = { ...light, ...readTokens(blockAfter(':root[data-theme="dark"]')) };

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
  ['--text-secondary', '--surface'],
  ['--text-muted', '--surface'],
  ['--text-muted', '--paper'],
  ['--on-brand', '--brand'],
  ['--on-brand', '--brand-hover'],
  ['--accent-fg', '--accent'],
  ['--income-fg', '--surface'],
  ['--expense-fg', '--surface'],
  ['--hold-fg', '--hold-bg'],
  ['--mint-fg', '--wash-mint'],
  ['--destructive-fg', '--surface'],
];

describe.each([
  ['light', light],
  ['dark', dark],
])('colour contrast in the %s theme', (_name, tokens) => {
  it.each(TEXT_PAIRS)('keeps %s readable on %s', (foreground, background) => {
    expect(contrast(tokens, foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the focus ring visible against the page', () => {
    expect(contrast(tokens, '--ring', '--paper')).toBeGreaterThanOrEqual(3);
  });
});

describe('contrast helper', () => {
  it('rates black on white as 21 and a colour on itself as 1', () => {
    const tokens = { '--a': '#000000', '--b': '#FFFFFF' };
    expect(contrast(tokens, '--a', '--b')).toBeCloseTo(21, 0);
    expect(contrast(tokens, '--a', '--a')).toBeCloseTo(1, 5);
  });

  it('follows var() references', () => {
    const tokens = { '--a': 'var(--b)', '--b': '#000000', '--c': '#FFFFFF' };
    expect(contrast(tokens, '--a', '--c')).toBeCloseTo(21, 0);
  });
});
