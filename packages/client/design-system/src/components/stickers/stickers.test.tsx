import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Sticker } from './Sticker';
import { StickerTile } from './StickerTile';
import {
  hasSticker,
  stickerFor,
  STICKER_ICON_NAMES,
  type StickerKind,
} from './stickerCatalog';
import { STICKER_NAMES } from './stickerNames';
import { STICKER_URLS } from './stickerUrls';

const EMOJI_DIR = resolve(__dirname, '../../assets/emoji');
const MIGRATIONS_DIR = resolve(
  __dirname,
  '../../../../../engine/infrastructure/src/persistence/migrations',
);

function seededIcons(file: string): string[] {
  const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8');
  return [...sql.matchAll(/\('[\w-]+', '[^']+', '([\w-]+)', '(?:expense|income)'/g)].map(
    (match) => match[1] ?? '',
  );
}

describe('sticker files', () => {
  it('lists exactly the svg files shipped in the assets folder', () => {
    const files = readdirSync(EMOJI_DIR)
      .filter((file) => file.endsWith('.svg'))
      .map((file) => file.slice(0, -4))
      .sort();
    expect([...STICKER_NAMES]).toEqual(files);
  });

  it('resolves a bundled url for every sticker', () => {
    for (const name of STICKER_NAMES) expect(STICKER_URLS[name]).toContain(`${name}.svg`);
  });

  it('keeps the license next to the files', () => {
    expect(readFileSync(resolve(EMOJI_DIR, 'LICENSE'), 'utf8')).toContain('MIT');
  });
});

describe('stickerFor', () => {
  it('follows the mockup for the default categories', () => {
    expect(stickerFor('fork-knife', 'category')).toEqual({ sticker: 'steaming_bowl', tone: 'orange' });
    expect(stickerFor('car', 'category')).toEqual({ sticker: 'automobile', tone: 'blue' });
    expect(stickerFor('heartbeat', 'category')).toEqual({ sticker: 'stethoscope', tone: 'red' });
    expect(stickerFor('house-line', 'category')).toEqual({ sticker: 'house', tone: 'teal' });
    expect(stickerFor('lightning', 'category')).toEqual({ sticker: 'high_voltage', tone: 'gold' });
  });

  it('uses a neutral sticker per kind for an unknown icon', () => {
    const fallbacks = (['category', 'wallet', 'module', 'recipe'] as StickerKind[]).map(
      (kind) => stickerFor('no-such-icon', kind).sticker,
    );
    expect(fallbacks).toEqual(['label', 'credit_card', 'pushpin', 'pot_of_food']);
  });

  it('does not treat object prototype keys as icons', () => {
    expect(hasSticker('constructor')).toBe(false);
    expect(stickerFor('constructor', 'category').sticker).toBe('label');
  });

  it('points every mapped icon to a sticker that exists', () => {
    for (const icon of STICKER_ICON_NAMES) {
      expect(STICKER_NAMES).toContain(stickerFor(icon, 'category').sticker);
    }
  });

  it('maps every icon seeded for categories', () => {
    const icons = seededIcons('spending/v100_spending_categories.sql');
    expect(icons.length).toBeGreaterThanOrEqual(8);
    for (const icon of icons) expect(hasSticker(icon)).toBe(true);
  });
});

describe('Sticker', () => {
  it('is decorative by default', () => {
    render(<Sticker name="bell" data-testid="sticker" />);
    const image = screen.getByTestId('sticker');
    expect(image).toHaveAttribute('aria-hidden', 'true');
    expect(image).toHaveAttribute('alt', '');
  });

  it('exposes a label when given one', () => {
    render(<Sticker name="bell" label="Nhắc nhở" size={32} />);
    const image = screen.getByRole('img', { name: 'Nhắc nhở' });
    expect(image).toHaveAttribute('width', '32');
    expect(image).not.toHaveAttribute('aria-hidden');
  });
});

describe('StickerTile', () => {
  it('draws the sticker of the icon in a round tile tinted by its tone', () => {
    const { container } = render(<StickerTile icon="car" kind="category" />);
    const tile = container.firstElementChild;
    expect(tile?.className).toContain('rounded-full');
    expect(tile?.className).toContain('sticker-tone-blue');
    expect(tile?.querySelector('img')).toHaveAttribute('data-sticker', 'automobile');
  });

  it('falls back to the neutral sticker for the kind', () => {
    const { container } = render(<StickerTile icon="unknown" kind="recipe" size="lg" />);
    expect(container.querySelector('img')).toHaveAttribute('data-sticker', 'pot_of_food');
    expect(container.firstElementChild?.className).toContain('size-12');
  });
});
