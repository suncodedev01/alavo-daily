import type { RecipeInput } from '@alavo-daily/common/engine';

import { extractRecipeJsonLd } from './jsonLd';

export type FetchPage = (url: string) => Promise<string>;
export type ParseJsonLd = (json: string) => Promise<RecipeInput | null>;

export class InvalidAddress extends Error {}

export class PageUnreachable extends Error {}

/** `example.com/bo-kho` becomes `https://example.com/bo-kho`. Null when it is not a web address. */
export function normalizePageUrl(address: string): string | null {
  const trimmed = address.trim();
  if (trimmed === '' || /\s/.test(trimmed)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    const isWeb = url.protocol === 'http:' || url.protocol === 'https:';
    return isWeb && url.hostname.includes('.') ? url.toString() : null;
  } catch {
    return null;
  }
}

/** The first recipe on the page that the engine can read, or null when the page has none. */
export async function readRecipeFromPage(
  address: string,
  fetchPage: FetchPage,
  parse: ParseJsonLd,
): Promise<RecipeInput | null> {
  const url = normalizePageUrl(address);
  if (url === null) throw new InvalidAddress();
  const html = await fetchPage(url).catch(() => {
    throw new PageUnreachable();
  });
  return firstReadable(extractRecipeJsonLd(html), parse);
}

async function firstReadable(candidates: string[], parse: ParseJsonLd): Promise<RecipeInput | null> {
  for (const candidate of candidates) {
    const recipe = await parse(candidate).catch(() => null);
    if (recipe !== null) return recipe;
  }
  return null;
}
