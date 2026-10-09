import { Link, useLocation } from 'react-router';

import { useT, type ModuleManifest } from '@alavo-daily/common';
import { NavItem, Sidebar, SidebarGroup, SidebarSeparator, StickerTile } from '@alavo-daily/design-system';

import { useModules } from '../../module-registry';
import { useSettings } from '../../hub-settings';
import { activeViewId, HOME_MODULE, isPathActive, ModuleSwitcherMenu, pinnedManifests, SETTINGS_PATH, useCurrentModule, useSelectModule } from '../../module-navigation';
import { SidebarFooterContent } from './SidebarFooterContent';

export function WideSidebar() {
  const current = useCurrentModule();
  return (
    <Sidebar
      header={
        <div className="p-2 pb-0">
          <ModuleSwitcherMenu current={current} />
        </div>
      }
      footer={<SidebarFooterContent />}
    >
      <ModuleNav manifest={current} />
    </Sidebar>
  );
}

function ModuleNav({ manifest }: { manifest: ModuleManifest }) {
  const t = useT();
  const { pathname, search } = useLocation();
  const activeId = activeViewId(manifest.views, pathname, search);
  const Extra = manifest.sidebarExtra;
  return (
    <>
      <SidebarGroup>
        {manifest.views.map((view) => (
          <NavItem
            key={view.id}
            icon={view.icon}
            label={t(view.label)}
            active={view.id === activeId}
            render={<Link to={view.path} />}
          />
        ))}
      </SidebarGroup>
      <SidebarSeparator />
      <SidebarGroup>
        <NavItem
          icon="gear"
          label={t('Cài đặt')}
          active={isPathActive(pathname, '/settings')}
          render={<Link to={SETTINGS_PATH} />}
        />
      </SidebarGroup>
      {manifest.id === HOME_MODULE.id ? <PinnedGroup /> : null}
      {Extra ? <Extra /> : null}
    </>
  );
}

function PinnedGroup() {
  const t = useT();
  const modules = useModules();
  const select = useSelectModule();
  const settings = useSettings();
  const pinned = pinnedManifests(modules, settings.data?.pinnedModules ?? []);
  if (pinned.length === 0) return null;
  return (
    <SidebarGroup label={t('Đã ghim')}>
      {pinned.map((manifest) => (
        <NavItem
          key={manifest.id}
          icon={manifest.icon}
          leading={<StickerTile icon={manifest.icon} kind="module" size="sm" />}
          label={t(manifest.name)}
          onClick={() => select(manifest.id)}
        />
      ))}
    </SidebarGroup>
  );
}
