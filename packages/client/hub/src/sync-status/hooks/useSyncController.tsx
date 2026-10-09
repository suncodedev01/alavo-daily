import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

import {
  SyncOrchestrator,
  useEngine,
  usePlatform,
  type EngineClient,
  type PlatformServices,
  type SyncController,
} from '@alavo-daily/common';

const SyncContext = createContext<SyncController | null>(null);

export interface SyncProviderProps {
  /** Replaces the real sync. `null` means this device cannot sync. Used by tests. */
  controller?: SyncController | null;
  children: ReactNode;
}

/**
 * Starts Google Drive sync when the platform can sign in to Google, and lets screens ask it to
 * connect, disconnect or sync now. Sync runs in the background and never blocks a screen.
 */
export function SyncProvider({ controller, children }: SyncProviderProps) {
  const engine = useEngine();
  const platform = usePlatform();
  const orchestrator = useMemo(
    () => (controller === undefined ? createOrchestrator(engine, platform) : null),
    [controller, engine, platform],
  );
  useEffect(() => orchestrator?.start(), [orchestrator]);
  const active = controller === undefined ? orchestrator : controller;
  return <SyncContext.Provider value={active}>{children}</SyncContext.Provider>;
}

/** The sync controller, or null on a device that cannot sync. */
export function useSyncController(): SyncController | null {
  return useContext(SyncContext);
}

function createOrchestrator(engine: EngineClient, platform: PlatformServices): SyncOrchestrator | null {
  if (!platform.capabilities.googleSync || !platform.googleAuth) return null;
  return new SyncOrchestrator({
    engine,
    auth: platform.googleAuth,
    fetch: (input, init) => globalThis.fetch(input, init),
  });
}
