import { describe, expect, it } from 'vitest';

import { extractI18nKeys } from '../../../../../scripts/extract-i18n-keys.mjs';
import { EN_TRANSLATIONS } from './locales/en';

const JARGON =
  /\b(json|json-ld|csv|sql|sqlite|api|oauth|token|html|url|wasm|opfs|payload|webview|keystore|regex)\b/i;

const keys = extractI18nKeys().keys;

describe('texts shown to people', () => {
  it('use no programmer terms in Vietnamese', () => {
    expect(keys.filter((key) => JARGON.test(key))).toEqual([]);
  });

  it('use no programmer terms in English', () => {
    const offenders = Object.entries(EN_TRANSLATIONS)
      .filter(([, text]) => JARGON.test(text))
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });

  it('catch a programmer term when one slips in', () => {
    expect(JARGON.test('Dán JSON-LD của công thức')).toBe(true);
    expect(JARGON.test('Xuất file CSV')).toBe(true);
    expect(JARGON.test('Xuất ra bảng tính')).toBe(false);
  });
});
