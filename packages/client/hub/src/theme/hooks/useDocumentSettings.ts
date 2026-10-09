import { useEffect } from 'react';

import type { Settings } from '@alavo-daily/common';

import { applyTheme, watchSystemTheme } from '../logic/theme';

export function useDocumentSettings(settings: Pick<Settings, 'theme' | 'language'>): void {
  useEffect(() => {
    applyTheme(settings.theme);
    if (settings.theme !== 'system') return undefined;
    return watchSystemTheme(() => applyTheme(settings.theme));
  }, [settings.theme]);
  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);
}
