import { useEffect } from 'react';

import type { Settings } from '@alavo-daily/common';

import { applyTheme } from '../logic/theme';

export function useDocumentSettings(settings: Pick<Settings, 'theme' | 'language'>): void {
  useEffect(() => applyTheme(settings.theme), [settings.theme]);
  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);
}
