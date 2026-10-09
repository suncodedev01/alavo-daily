import { useMemo, useState } from 'react';
import { HashRouter } from 'react-router';

import {
  EngineGate,
  ReminderProvider,
  EngineProvider,
  I18nProvider,
  PlatformProvider,
  createI18n,
  type EngineClient,
  type ModuleManifest,
  type PlatformServices,
  type Settings,
} from '@alavo-daily/common';
import { Toaster } from '@alavo-daily/design-system';

import { useSettings } from '../../hub-settings';
import { AppLoading, EngineFailure } from './EngineFailure';
import { AppRoutes } from './AppRoutes';
import { DEFAULT_MODULES, ModuleBackgrounds, ModulesProvider } from '../../module-registry';
import { useDocumentSettings } from '../../theme';

export interface AlavoAppProps {
  engine: EngineClient;
  platform: PlatformServices;
  modules?: readonly ModuleManifest[];
}

export function AlavoApp({ engine, platform, modules = DEFAULT_MODULES }: AlavoAppProps) {
  const [bootI18n] = useState(() => createI18n('vi'));
  return (
    <EngineProvider client={engine}>
      <PlatformProvider platform={platform}>
        <I18nProvider i18n={bootI18n}>
          <EngineGate loading={<AppLoading />} failed={(message) => <EngineFailure message={message} />}>
            <ConfiguredApp modules={modules} />
          </EngineGate>
        </I18nProvider>
      </PlatformProvider>
    </EngineProvider>
  );
}

function ConfiguredApp({ modules }: { modules: readonly ModuleManifest[] }) {
  const settings = useSettings();
  if (settings.isError) return <EngineFailure message={settings.error.message} />;
  if (!settings.data) return <AppLoading />;
  return <ReadyApp settings={settings.data} modules={modules} />;
}

function ReadyApp({ settings, modules }: { settings: Settings; modules: readonly ModuleManifest[] }) {
  const i18n = useMemo(() => createI18n(settings.language), [settings.language]);
  useDocumentSettings(settings);
  return (
    <I18nProvider i18n={i18n}>
      <ModulesProvider modules={modules}>
        <ReminderProvider>
          <ModuleBackgrounds />
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </ReminderProvider>
      </ModulesProvider>
      <Toaster />
    </I18nProvider>
  );
}
