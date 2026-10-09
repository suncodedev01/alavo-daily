import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';

import type { ModuleManifest } from '@alavo-daily/common';

import { useModules } from '../../module-registry';
import { useSettings, useUpdateSettings } from '../../hub-settings';
import { HOME_MODULE, findModuleAt, firstViewPath, pushRecentModule } from '../logic/navigation';

export function useCurrentModule(): ModuleManifest {
  const modules = useModules();
  const { pathname } = useLocation();
  return findModuleAt(modules, pathname) ?? HOME_MODULE;
}

/** Opens a module at its first view and remembers it as recently used. */
export function useSelectModule(): (moduleId: string) => void {
  const modules = useModules();
  const navigate = useNavigate();
  const settings = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();
  const recent = settings.data?.recentModules;
  return useCallback(
    (moduleId) => {
      const target = [HOME_MODULE, ...modules].find((manifest) => manifest.id === moduleId);
      if (!target) return;
      navigate(firstViewPath(target));
      if (target === HOME_MODULE) return;
      updateSettings({ recentModules: pushRecentModule(recent ?? [], moduleId) });
    },
    [modules, navigate, recent, updateSettings],
  );
}
