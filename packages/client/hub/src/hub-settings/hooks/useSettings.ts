import { useEngineMutation, useEngineQuery } from '@alavo-daily/common';

export function useSettings() {
  return useEngineQuery('hub.get_settings');
}

export function useUpdateSettings() {
  return useEngineMutation('hub.update_settings');
}
