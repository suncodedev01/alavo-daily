import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyTheme, isDarkTheme, oppositeTheme } from './theme';

describe('theme helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('dark') }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('writes an explicit theme and clears it for system', () => {
    const root = document.createElement('html');
    applyTheme('dark', root);
    expect(root.getAttribute('data-theme')).toBe('dark');
    applyTheme('system', root);
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('follows the system preference only for the system theme', () => {
    expect(isDarkTheme('system')).toBe(true);
    expect(isDarkTheme('light')).toBe(false);
    expect(isDarkTheme('dark')).toBe(true);
  });

  it('toggles to the opposite of what is shown', () => {
    expect(oppositeTheme('dark')).toBe('light');
    expect(oppositeTheme('light')).toBe('dark');
    expect(oppositeTheme('system')).toBe('light');
  });
});
