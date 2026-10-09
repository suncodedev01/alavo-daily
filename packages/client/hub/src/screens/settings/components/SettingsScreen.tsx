import { useNavigate, useParams } from 'react-router';

import { Screen, useT } from '@alavo-daily/common';
import { PageColumn, Segmented } from '@alavo-daily/design-system';

import { LanguageCard } from './LanguageCard';
import { NotificationsTab } from './NotificationsTab';
import { SyncDock, SyncTab } from './SyncTab';

type SettingsTab = 'sync' | 'notifications';

export function tabFromParam(param: string | undefined): SettingsTab {
  return param === 'notifications' ? 'notifications' : 'sync';
}

export function SettingsScreen() {
  const t = useT();
  const navigate = useNavigate();
  const tab = tabFromParam(useParams().tab);
  return (
    <Screen title={t('Cài đặt')} dock={tab === 'sync' ? <SyncDock /> : undefined}>
      <PageColumn maxWidth="detail">
        <Segmented
          label={t('Mục cài đặt')}
          value={tab}
          onChange={(next) => navigate(`/settings/${next}`)}
          options={[
            { value: 'sync', label: t('Đồng bộ Google') },
            { value: 'notifications', label: t('Thông báo') },
          ]}
          className="justify-self-start"
        />
        {tab === 'sync' ? <SyncTab /> : <NotificationsTab />}
        <LanguageCard />
      </PageColumn>
    </Screen>
  );
}
