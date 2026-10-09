import type { ModuleManifest, QuickAction } from '@alavo-daily/common';

export interface ComingApp {
  name: string;
  icon: string;
  description: string;
}

export const COMING_APPS: readonly ComingApp[] = [
  { name: 'Công việc', icon: 'checks', description: 'Việc cần làm, nhắc theo ngày' },
  { name: 'Sức khoẻ', icon: 'heartbeat', description: 'Cân nặng, giấc ngủ, uống thuốc' },
  { name: 'Thói quen', icon: 'fire', description: 'Theo dõi chuỗi ngày' },
  { name: 'Ghi chú', icon: 'book-open', description: 'Ghi nhanh, gắn thẻ' },
  { name: 'Du lịch', icon: 'airplane-tilt', description: 'Lịch trình và chi phí chuyến đi' },
  { name: 'Học tập', icon: 'graduation-cap', description: 'Lịch học, thẻ ghi nhớ' },
];

type Translate = (key: string) => string;

export function matchesQuery(query: string, ...texts: string[]): boolean {
  const needle = query.trim().toLowerCase();
  return needle === '' || texts.join(' ').toLowerCase().includes(needle);
}

export function togglePinned(pinned: readonly string[], moduleId: string): string[] {
  return pinned.includes(moduleId) ? pinned.filter((id) => id !== moduleId) : [...pinned, moduleId];
}

export function filterModules(
  modules: readonly ModuleManifest[],
  query: string,
  t: Translate,
): ModuleManifest[] {
  return modules.filter((manifest) => matchesQuery(query, t(manifest.name), t(manifest.description)));
}

export function filterComingApps(query: string, t: Translate): ComingApp[] {
  return COMING_APPS.filter((app) => matchesQuery(query, t(app.name), t(app.description)));
}

export interface QuickActionHit extends QuickAction {
  moduleName: string;
}

export function filterQuickActions(
  modules: readonly ModuleManifest[],
  query: string,
  t: Translate,
): QuickActionHit[] {
  if (query.trim() === '') return [];
  return modules.flatMap((manifest) =>
    (manifest.quickActions ?? [])
      .filter((action) => matchesQuery(query, t(action.label)))
      .map((action) => ({ ...action, moduleName: manifest.name })),
  );
}

export function recentManifests(
  modules: readonly ModuleManifest[],
  recentIds: readonly string[],
): ModuleManifest[] {
  return recentIds.flatMap((id) => modules.filter((manifest) => manifest.id === id));
}
