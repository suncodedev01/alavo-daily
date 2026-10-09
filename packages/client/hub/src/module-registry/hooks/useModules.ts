import { createContext, useContext } from 'react';

import type { ModuleManifest } from '@alavo-daily/common';

export const ModulesContext = createContext<readonly ModuleManifest[] | null>(null);

export function useModules(): readonly ModuleManifest[] {
  const modules = useContext(ModulesContext);
  if (!modules) throw new Error('useModules must be used inside <ModulesProvider>');
  return modules;
}
