import { useNavigate } from 'react-router';

import { useEngineQuery, useT } from '@alavo-daily/common';
import { IconButton, useToast } from '@alavo-daily/design-system';

import { SETTINGS_PATH } from '../../module-navigation';
import { useSyncActions } from '../hooks/useSyncActions';
import { describeSync } from '../logic/describeSync';
import { quickSyncFor } from '../logic/quickSync';

export function SyncNowButton() {
  const t = useT();
  const navigate = useNavigate();
  const { toast } = useToast();
  const actions = useSyncActions();
  const status = useEngineQuery('sync.status');
  if (!actions.available) return null;
  const quick = quickSyncFor(status.data?.state, t);
  const working = actions.busy !== null || status.data?.state === 'syncing';
  const press = () => {
    if (quick.action === 'open-settings') navigate(SETTINGS_PATH);
    else if (quick.action === 'sign-in') actions.connect();
    else {
      actions.syncNow();
      toast(t('Đang đồng bộ…'));
    }
  };
  return (
    <IconButton
      icon={describeSync(status.data, t).icon}
      label={quick.label}
      variant="outline"
      disabled={working}
      onClick={press}
    />
  );
}
