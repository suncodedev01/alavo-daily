import { Link } from 'react-router';

import { useEngineQuery, useT } from '@alavo-daily/common';
import { Icon } from '@alavo-daily/design-system';

import { SETTINGS_PATH } from '../../module-navigation';
import { describeSync } from '../logic/describeSync';

export function SyncRow() {
  const t = useT();
  const status = useEngineQuery('sync.status');
  const sync = describeSync(status.data, t);
  return (
    <Link
      to={SETTINGS_PATH}
      className="focus-ring mx-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-surface-tint max-compact:justify-center max-compact:px-0"
    >
      <Icon name={sync.icon} size="lg" className="text-text-secondary" />
      <span className="min-w-0 flex-1 max-compact:sr-only">
        <span className="block truncate text-sm font-medium">{sync.title}</span>
        <span className="block truncate text-xs text-text-muted">{sync.subtitle}</span>
      </span>
    </Link>
  );
}
