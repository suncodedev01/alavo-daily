import { useLocation, useNavigate } from 'react-router';

import { useT, type ModuleManifest, type ModuleView } from '@alavo-daily/common';
import { TabBar, TabBarAction, TabBarItem } from '@alavo-daily/design-system';

import { useModules } from '../../module-registry';
import { useSettings } from '../../hub-settings';
import { activeViewId, HOME_MODULE, isPathActive, narrowPinnedSlots, pinnedManifests, SETTINGS_PATH, tabViews, useSelectModule } from '../../module-navigation';

export function NarrowTabBar({ manifest }: { manifest: ModuleManifest }) {
  return manifest.id === HOME_MODULE.id ? <HomeTabBar /> : <ModuleTabBar manifest={manifest} />;
}

function ModuleTabBar({ manifest }: { manifest: ModuleManifest }) {
  const t = useT();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const activeId = activeViewId(manifest.views, pathname, search);
  const tabs = tabViews(manifest);
  const action = manifest.quickActions?.[0];
  const middle = Math.ceil(tabs.length / 2);
  const renderTab = (view: ModuleView) => (
    <TabBarItem
      key={view.id}
      icon={view.icon}
      label={t(view.label)}
      active={view.id === activeId}
      onClick={() => navigate(view.path)}
    />
  );
  return (
    <TabBar label={t('Điều hướng')}>
      {tabs.slice(0, middle).map(renderTab)}
      {action ? <TabBarAction icon="plus" label={t(action.label)} onClick={() => navigate(action.path)} /> : null}
      {tabs.slice(middle).map(renderTab)}
    </TabBar>
  );
}

function HomeTabBar() {
  const t = useT();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const modules = useModules();
  const select = useSelectModule();
  const settings = useSettings();
  const [first, second] = narrowPinnedSlots(pinnedManifests(modules, settings.data?.pinnedModules ?? []));
  const renderPinned = (manifest: ModuleManifest | undefined) =>
    manifest ? (
      <TabBarItem icon={manifest.icon} label={t(manifest.name)} onClick={() => select(manifest.id)} />
    ) : null;
  return (
    <TabBar label={t('Điều hướng')}>
      <TabBarItem
        icon="house"
        label={t('Hôm nay')}
        active={isPathActive(pathname, '/today')}
        onClick={() => navigate('/today')}
      />
      {renderPinned(first)}
      <TabBarAction
        icon="compass"
        label={t('Khám phá')}
        showLabel
        active={isPathActive(pathname, '/explore')}
        onClick={() => navigate('/explore')}
      />
      {renderPinned(second)}
      <TabBarItem
        icon="gear"
        label={t('Cài đặt')}
        active={isPathActive(pathname, '/settings')}
        onClick={() => navigate(SETTINGS_PATH)}
      />
    </TabBar>
  );
}
