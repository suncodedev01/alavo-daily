import type { ModuleManifest, ModuleView } from '@alavo-daily/common';

export const HOME_MODULE: ModuleManifest = {
  id: 'today',
  name: 'Hôm nay',
  icon: 'house',
  description: 'Tổng hợp mọi ứng dụng',
  views: [
    { id: 'today', label: 'Hôm nay', icon: 'house', path: '/today', tab: true },
    { id: 'explore', label: 'Khám phá', icon: 'compass', path: '/explore' },
  ],
  routes: [],
};

export const SETTINGS_PATH = '/settings/sync';
export const NOTIFICATION_SETTINGS_PATH = '/settings/notifications';
export const MAX_RECENT_MODULES = 4;
const NARROW_PINNED_SLOTS = 2;

export function firstSegment(pathname: string): string {
  return pathname.split('/')[1] ?? '';
}

export function findModuleAt(
  modules: readonly ModuleManifest[],
  pathname: string,
): ModuleManifest | null {
  const id = firstSegment(pathname);
  return modules.find((manifest) => manifest.id === id) ?? null;
}

export function isPathActive(pathname: string, path: string): boolean {
  const base = path.split('?')[0] ?? path;
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function firstViewPath(manifest: ModuleManifest): string {
  return manifest.views[0]?.path ?? `/${manifest.id}`;
}

export function tabViews(manifest: ModuleManifest): ModuleView[] {
  return manifest.views.filter((view) => view.tab).slice(0, 4);
}

export function moreScreenPath(manifest: ModuleManifest): string {
  return `/${manifest.id}/more`;
}

export function sidebarViews(manifest: ModuleManifest): ModuleView[] {
  return manifest.views.filter((view) => !view.more);
}

/** "Khác" stays lit on its own screen and on every screen that lives under it. */
export function isMoreActive(manifest: ModuleManifest, pathname: string, search: string): boolean {
  if (!manifest.more) return false;
  if (isPathActive(pathname, moreScreenPath(manifest))) return true;
  const id = activeViewId(manifest.views, pathname, search);
  return manifest.views.find((view) => view.id === id)?.more === true;
}

export function pinnedManifests(
  modules: readonly ModuleManifest[],
  pinnedIds: readonly string[],
): ModuleManifest[] {
  return pinnedIds.flatMap((id) => modules.filter((manifest) => manifest.id === id));
}

export function narrowPinnedSlots(pinned: ModuleManifest[]): ModuleManifest[] {
  return pinned.slice(0, NARROW_PINNED_SLOTS);
}

export function pushRecentModule(recent: readonly string[], moduleId: string): string[] {
  return [moduleId, ...recent.filter((id) => id !== moduleId)].slice(0, MAX_RECENT_MODULES);
}

function queryOf(path: string): URLSearchParams {
  return new URLSearchParams(path.split('?')[1] ?? '');
}

function queryMatches(path: string, current: URLSearchParams): boolean {
  return [...queryOf(path)].every(([key, value]) => current.get(key) === value);
}

export function activeViewId(
  views: readonly ModuleView[],
  pathname: string,
  search: string,
): string | null {
  const current = new URLSearchParams(search);
  const onPath = views.filter((view) => isPathActive(pathname, view.path));
  const withQuery = onPath.filter((view) => view.path.includes('?') && queryMatches(view.path, current));
  const plain = onPath.filter((view) => !view.path.includes('?'));
  return (withQuery[0] ?? plain[0])?.id ?? null;
}
