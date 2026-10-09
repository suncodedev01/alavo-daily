export const SUPPORTED_LANGUAGES = ['vi', 'en'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'vi';

export function toLanguage(value: string): Language {
  return SUPPORTED_LANGUAGES.find((language) => language === value) ?? DEFAULT_LANGUAGE;
}
