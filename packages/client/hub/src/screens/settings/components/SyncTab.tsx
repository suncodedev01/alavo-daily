import { useEngineQuery } from '@alavo-daily/common';

import { ConflictsCard } from './ConflictsCard';
import { LocalDataCard } from './LocalDataCard';
import { SyncConnectionCard } from './SyncConnectionCard';

export { SyncDock } from './SyncDock';

export function SyncTab() {
  const status = useEngineQuery('sync.status');
  const hasConflicts = (status.data?.conflictCount ?? 0) > 0 && status.data?.state !== 'off';
  return (
    <>
      <SyncConnectionCard status={status.data} />
      {hasConflicts ? <ConflictsCard /> : null}
      <LocalDataCard />
    </>
  );
}
