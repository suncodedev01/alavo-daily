import i18next, { type i18n as I18n } from 'i18next';
import { I18nextProvider, useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

import { DEFAULT_LANGUAGE, toLanguage, type Language } from './language';
import { EN_TRANSLATIONS } from './locales/en';

export { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, toLanguage, type Language } from './language';

export type Translations = Record<string, string>;

const BUILT_IN_TRANSLATIONS: Record<string, Translations> = { en: EN_TRANSLATIONS };

/**
 * Text keys are the Vietnamese sentences themselves, so a missing translation shows the
 * original text. `{{name}}` marks interpolation. Languages other than Vietnamese ship as tables in
 * `locales/`, and passing `resources` replaces them (tests use that).
 */
export function createI18n(
  language = 'vi',
  resources: Record<string, Translations> = BUILT_IN_TRANSLATIONS,
): I18n {
  const instance = i18next.createInstance();
  void instance.init({
    lng: language,
    fallbackLng: 'vi',
    keySeparator: false,
    nsSeparator: false,
    returnEmptyString: false,
    interpolation: { escapeValue: false },
    resources: Object.fromEntries(
      Object.entries({ vi: {}, ...resources }).map(([lang, table]) => [lang, { translation: table }]),
    ),
  });
  return instance;
}

export function I18nProvider({ i18n, children }: { i18n: I18n; children: ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

/** `const t = useT(); t('Tổng quan'); t('Còn {{count}} món', { count: 3 })`. */
export function useT(): (key: string, values?: Record<string, string | number>) => string {
  const { t } = useTranslation();
  return (key, values) => t(key, values) as string;
}

export function useLanguage(): Language {
  const { i18n } = useTranslation();
  return toLanguage(i18n.language ?? DEFAULT_LANGUAGE);
}
