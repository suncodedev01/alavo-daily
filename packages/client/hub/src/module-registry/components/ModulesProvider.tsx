import type { ReactNode } from 'react';

import type { ModuleManifest } from '@alavo-daily/common';

import { ModulesContext } from '../hooks/useModules';

export function ModulesProvider({
  modules,
  children,
}: {
  modules: readonly ModuleManifest[];
  children: ReactNode;
}) {
  return <ModulesContext.Provider value={modules}>{children}</ModulesContext.Provider>;
}
