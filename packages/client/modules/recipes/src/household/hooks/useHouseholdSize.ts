import { useEngineQuery } from '@alavo-daily/common/engine';

import { DEFAULT_HOUSEHOLD_SIZE } from '../../vocabulary';

export function useHouseholdSize(): number {
  const settings = useEngineQuery('hub.get_settings');
  return settings.data?.householdSize ?? DEFAULT_HOUSEHOLD_SIZE;
}
