import { describe, expect, it } from 'vitest';

import { extractI18nKeys } from '../../../../../scripts/extract-i18n-keys.mjs';
import { EN_TRANSLATIONS } from './locales/en';

const extracted = extractI18nKeys();

describe('English dictionary coverage', () => {
  it('has a translation for every text the code can show', () => {
    const untranslated = extracted.keys.filter((key) => !(key in EN_TRANSLATIONS));
    expect(untranslated).toEqual([]);
  });

  it('has no translation for a text that no longer exists in the code', () => {
    const known = new Set(extracted.keys);
    const stale = Object.keys(EN_TRANSLATIONS).filter((key) => !known.has(key));
    expect(stale).toEqual([]);
  });

  it('keeps the same placeholders as the Vietnamese text', () => {
    const mismatched = Object.entries(EN_TRANSLATIONS)
      .filter(([key, text]) => placeholdersOf(key) !== placeholdersOf(text))
      .map(([key]) => key);
    expect(mismatched).toEqual([]);
  });

  it('has no Vietnamese text written directly in a screen outside of t()', () => {
    expect(Object.keys(extracted.hardcodedJsx)).toEqual([]);
  });
});

function placeholdersOf(text: string): string {
  return (text.match(/\{\{\w+\}\}/g) ?? []).sort().join(',');
}
