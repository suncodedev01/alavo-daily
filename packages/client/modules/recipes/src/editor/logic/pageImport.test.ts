import type { RecipeInput } from '@alavo-daily/common/engine';
import { describe, expect, it, vi } from 'vitest';

import { InvalidAddress, normalizePageUrl, PageUnreachable, readRecipeFromPage } from './pageImport';

const RECIPE: RecipeInput = {
  name: 'Bò kho',
  tags: [],
  prepMin: 0,
  cookMin: 0,
  servings: 4,
  ingredients: [{ name: 'Bắp bò', quantity: 500, unit: 'g', aisle: 'meat_fish' }],
  steps: [],
};

const PAGE = `<script type="application/ld+json">{"@graph":[{"@type":"Recipe","name":"Bò kho"}]}</script>`;

describe('normalizePageUrl', () => {
  it('keeps a full web address', () => {
    expect(normalizePageUrl('https://example.com/bo-kho')).toBe('https://example.com/bo-kho');
    expect(normalizePageUrl('http://example.com/a?b=1')).toBe('http://example.com/a?b=1');
  });

  it('adds https when the scheme is missing and trims spaces around', () => {
    expect(normalizePageUrl('  example.com/bo-kho ')).toBe('https://example.com/bo-kho');
  });

  it('rejects text that is not a web address', () => {
    expect(normalizePageUrl('')).toBeNull();
    expect(normalizePageUrl('   ')).toBeNull();
    expect(normalizePageUrl('bò kho')).toBeNull();
    expect(normalizePageUrl('localhost')).toBeNull();
  });

  it('rejects other schemes', () => {
    expect(normalizePageUrl('ftp://example.com/a')).toBeNull();
    expect(normalizePageUrl('javascript://example.com/%0Aalert(1)')).toBeNull();
    expect(normalizePageUrl('file:///etc/passwd')).toBeNull();
  });
});

describe('readRecipeFromPage', () => {
  it('fetches the normalized address and parses the recipe JSON-LD of the page', async () => {
    const fetchPage = vi.fn(async () => PAGE);
    const parse = vi.fn(async () => RECIPE);
    const recipe = await readRecipeFromPage('example.com/bo-kho', fetchPage, parse);
    expect(recipe).toBe(RECIPE);
    expect(fetchPage).toHaveBeenCalledWith('https://example.com/bo-kho');
    expect(parse).toHaveBeenCalledWith('{"@type":"Recipe","name":"Bò kho"}');
  });

  it('tries the next recipe when the engine cannot read the first', async () => {
    const html = `<script type="application/ld+json">[{"@type":"Recipe","name":"A"},{"@type":"Recipe","name":"B"}]</script>`;
    const parse = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(RECIPE);
    await expect(readRecipeFromPage('https://example.com', async () => html, parse)).resolves.toBe(RECIPE);
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it('skips a recipe whose parsing throws', async () => {
    const html = `<script type="application/ld+json">[{"@type":"Recipe","name":"A"},{"@type":"Recipe","name":"B"}]</script>`;
    const parse = vi.fn().mockRejectedValueOnce(new Error('bad')).mockResolvedValueOnce(RECIPE);
    await expect(readRecipeFromPage('https://example.com', async () => html, parse)).resolves.toBe(RECIPE);
  });

  it('returns null and never calls the engine when the page has no recipe', async () => {
    const parse = vi.fn();
    const recipe = await readRecipeFromPage('https://example.com', async () => '<p>no data</p>', parse);
    expect(recipe).toBeNull();
    expect(parse).not.toHaveBeenCalled();
  });

  it('reports a page that cannot be fetched as unreachable', async () => {
    const fetchPage = async () => {
      throw new TypeError('network');
    };
    await expect(readRecipeFromPage('https://example.com', fetchPage, vi.fn())).rejects.toBeInstanceOf(
      PageUnreachable,
    );
  });

  it('rejects a bad address before fetching anything', async () => {
    const fetchPage = vi.fn();
    await expect(readRecipeFromPage('not an address', fetchPage, vi.fn())).rejects.toBeInstanceOf(InvalidAddress);
    expect(fetchPage).not.toHaveBeenCalled();
  });
});
