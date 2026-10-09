import i18next, { type i18n as I18n } from 'i18next';
import { I18nextProvider, useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

export type Translations = Record<string, string>;

/**
 * Text keys are the Vietnamese sentences themselves, so a missing translation shows the
 * original text. `{{name}}` marks interpolation. Add a language by passing its table.
 */
export function createI18n(
  language = 'vi',
  resources: Record<string, Translations> = {},
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
