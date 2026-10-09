export type ShowcaseView = 'chrome' | 'components' | 'app' | 'mobile';
export type ShowcaseTheme = 'light' | 'dark' | 'system';

export type ShowcaseQuery = { view: ShowcaseView; theme: ShowcaseTheme; layout: 'wide' | 'narrow' };

const VIEWS: readonly ShowcaseView[] = ['chrome', 'components', 'app', 'mobile'];

export function readQuery(search: string = window.location.search): ShowcaseQuery {
  const params = new URLSearchParams(search);
  const view = params.get('view') as ShowcaseView;
  const theme = params.get('theme');
  return {
    view: VIEWS.includes(view) ? view : 'chrome',
    theme: theme === 'dark' || theme === 'light' ? theme : 'system',
    layout: params.get('layout') === 'narrow' ? 'narrow' : 'wide',
  };
}

export function applyTheme(theme: ShowcaseTheme): void {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

export function buildHref(patch: Partial<ShowcaseQuery>): string {
  const next = { ...readQuery(), ...patch };
  const params = new URLSearchParams({ view: next.view, theme: next.theme, layout: next.layout });
  return `?${params.toString()}`;
}
