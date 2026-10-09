import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';

import { Screen, useT } from '@alavo-daily/common';
import { PageColumn, Segmented } from '@alavo-daily/design-system';

import { PaletteDock, PaletteTab } from '../../../palette/index';
import { LanguageCard } from './LanguageCard';
import { NotificationsTab } from './NotificationsTab';
import { ThemeCard } from './ThemeCard';
import { SyncDock, SyncTab } from './SyncTab';

type SettingsTab = 'sync' | 'notifications' | 'palette';

export function tabFromParam(param: string | undefined): SettingsTab {
  if (param === 'notifications' || param === 'palette') return param;
  return 'sync';
}

function dockFor(tab: SettingsTab): ReactNode {
  if (tab === 'sync') return <SyncDock />;
  return tab === 'palette' ? <PaletteDock /> : undefined;
}

function TabContent({ tab }: { tab: SettingsTab }) {
  if (tab === 'sync') return <SyncTab />;
  return tab === 'palette' ? <PaletteTab /> : <NotificationsTab />;
}

export function SettingsScreen() {
  const t = useT();
  const navigate = useNavigate();
  const tab = tabFromParam(useParams().tab);
  return (
    <Screen title={t('Cài đặt')} dock={dockFor(tab)}>
      <PageColumn maxWidth="detail">
        <Segmented
          label={t('Mục cài đặt')}
          value={tab}
          onChange={(next) => navigate(`/settings/${next}`)}
          options={[
            { value: 'sync', label: t('Đồng bộ Google') },
            { value: 'notifications', label: t('Thông báo') },
            { value: 'palette', label: t('Bộ màu') },
          ]}
          className="justify-self-start"
        />
        <TabContent tab={tab} />
        <ThemeCard />
        <LanguageCard />
      </PageColumn>
    </Screen>
  );
}
