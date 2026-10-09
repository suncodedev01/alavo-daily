import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Screen, useT, type ModuleManifest } from '@alavo-daily/common';
import {
  Card,
  CardHeader,
  CardTitle,
  Eyebrow,
  IconTile,
  PageColumn,
  Pill,
  SearchField,
} from '@alavo-daily/design-system';

import { useModules } from '../../../module-registry';
import { useSettings, useUpdateSettings } from '../../../hub-settings';
import { pinnedManifests, useSelectModule } from '../../../module-navigation';
import { AppCard } from './AppCard';
import { ExploreDock } from './ExploreDock';
import {
  filterComingApps,
  filterModules,
  filterQuickActions,
  recentManifests,
  togglePinned,
} from '../logic/explore';

export function ExploreScreen() {
  const t = useT();
  const modules = useModules();
  const select = useSelectModule();
  const settings = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();
  const [query, setQuery] = useState('');
  const pinnedIds = settings.data?.pinnedModules ?? [];
  const togglePin = (moduleId: string) => updateSettings({ pinnedModules: togglePinned(pinnedIds, moduleId) });
  const searching = query.trim() !== '';
  return (
    <Screen
      title={t('Khám phá')}
      dock={<ExploreDock pinned={pinnedManifests(modules, pinnedIds)} onUnpin={togglePin} />}
    >
      <PageColumn maxWidth="detail">
        <SearchField
          value={query}
          onValueChange={setQuery}
          label={t('Tìm ứng dụng')}
          placeholder={t('Tìm ứng dụng hoặc việc cần làm')}
        />
        {searching ? null : <RecentRow recent={settings.data?.recentModules ?? []} onOpen={select} />}
        <QuickActionResults query={query} />
        <YourApps query={query} pinnedIds={pinnedIds} onOpen={select} onTogglePin={togglePin} />
        <ComingSoon query={query} />
      </PageColumn>
    </Screen>
  );
}

function RecentRow({ recent, onOpen }: { recent: readonly string[]; onOpen: (id: string) => void }) {
  const t = useT();
  const items = recentManifests(useModules(), recent);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Eyebrow>{t('Gần đây')}</Eyebrow>
      {items.map((manifest) => (
        <Pill key={manifest.id} leadingIcon={manifest.icon} onClick={() => onOpen(manifest.id)}>
          {t(manifest.name)}
        </Pill>
      ))}
    </div>
  );
}

function QuickActionResults({ query }: { query: string }) {
  const t = useT();
  const navigate = useNavigate();
  const hits = filterQuickActions(useModules(), query, t);
  if (hits.length === 0) return null;
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>{t('Việc cần làm')}</CardTitle>
      </CardHeader>
      {hits.map((hit) => (
        <button
          key={hit.id}
          type="button"
          onClick={() => navigate(hit.path)}
          className="focus-ring flex min-h-12 w-full items-center gap-3 rounded-lg text-left hover:bg-surface-tint"
        >
          <IconTile icon={hit.icon} size="sm" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{t(hit.label)}</span>
          <span className="text-xs text-text-muted">{t(hit.moduleName)}</span>
        </button>
      ))}
    </Card>
  );
}

interface YourAppsProps {
  query: string;
  pinnedIds: readonly string[];
  onOpen: (id: string) => void;
  onTogglePin: (id: string) => void;
}

function YourApps({ query, pinnedIds, onOpen, onTogglePin }: YourAppsProps) {
  const t = useT();
  const apps: ModuleManifest[] = filterModules(useModules(), query, t);
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>{t('Ứng dụng của bạn')}</CardTitle>
      </CardHeader>
      {apps.length === 0 ? (
        <p className="text-sm text-text-muted">{t('Không có ứng dụng nào khớp.')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {apps.map((manifest) => (
            <AppCard
              key={manifest.id}
              manifest={manifest}
              pinned={pinnedIds.includes(manifest.id)}
              onOpen={() => onOpen(manifest.id)}
              onTogglePin={() => onTogglePin(manifest.id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function ComingSoon({ query }: { query: string }) {
  const t = useT();
  const apps = filterComingApps(query, t);
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>{t('Sắp có')}</CardTitle>
        <span className="text-xs text-text-muted">{t('{{count}} ứng dụng', { count: apps.length })}</span>
      </CardHeader>
      {apps.length === 0 ? (
        <p className="text-sm text-text-muted">{t('Không có ứng dụng nào khớp.')}</p>
      ) : (
        <ul>
          {apps.map((app) => (
            <li key={app.name} className="flex items-center gap-3 py-2.5">
              <IconTile icon={app.icon} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t(app.name)}</p>
                <p className="text-xs text-text-muted">{t(app.description)}</p>
              </div>
              <span className="text-xs text-text-muted">{t('Sắp có')}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
