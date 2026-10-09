import type { ThemeSetting } from '@alavo-daily/common';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function applyTheme(theme: ThemeSetting, root: HTMLElement = document.documentElement): void {
  root.setAttribute('data-theme', isDarkTheme(theme) ? 'dark' : 'light');
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

export function watchSystemTheme(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(DARK_QUERY);
  if (typeof query.addEventListener !== 'function') return () => {};
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function isDarkTheme(theme: ThemeSetting): boolean {
  return theme === 'dark' || (theme === 'system' && systemPrefersDark());
}

export function oppositeTheme(theme: ThemeSetting): ThemeSetting {
  return isDarkTheme(theme) ? 'light' : 'dark';
}
