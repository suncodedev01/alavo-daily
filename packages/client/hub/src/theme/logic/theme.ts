import type { ThemeSetting } from '@alavo-daily/common';

export function applyTheme(theme: ThemeSetting, root: HTMLElement = document.documentElement): void {
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function isDarkTheme(theme: ThemeSetting): boolean {
  return theme === 'dark' || (theme === 'system' && systemPrefersDark());
}

export function oppositeTheme(theme: ThemeSetting): ThemeSetting {
  return isDarkTheme(theme) ? 'light' : 'dark';
}
