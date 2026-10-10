import type { NetworkWatch } from '../syncOrchestrator';
import { SyncOrchestrator } from '../syncOrchestrator';
import { FakeDrive } from './fakeDrive';
import { FakeGoogleAuth } from './fakeAuth';
import { FakeSyncEngine } from './fakeSyncEngine';

export class FakeNetwork implements NetworkWatch {
  online = true;
  private readonly listeners = new Set<() => void>();

  isOnline(): boolean {
    return this.online;
  }

  onOnline(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  comeBack(): void {
    this.online = true;
    this.listeners.forEach((listener) => listener());
  }
}

export interface SimulatedDevice {
  engine: FakeSyncEngine;
  auth: FakeGoogleAuth;
  network: FakeNetwork;
  orchestrator: SyncOrchestrator;
}

/** One Google Drive and a shared clock that only moves forward, for several simulated devices. */
export function createWorld() {
  let tick = 0;
  const clock = () => (tick += 1);
  const drive = new FakeDrive();

  function addDevice(
    deviceId: string,
    options: { debounceMs?: number; timerFromSettings?: boolean } = {},
  ): SimulatedDevice {
    const engine = new FakeSyncEngine(deviceId, clock);
    const auth = new FakeGoogleAuth((token) => drive.accounts.add(token));
    const network = new FakeNetwork();
    const orchestrator = new SyncOrchestrator({
      engine,
      auth,
      fetch: drive.fetch,
      network,
      sleep: async () => undefined,
      pollMs: options.timerFromSettings ? undefined : 0,
      debounceMs: options.debounceMs,
      retryDelaysMs: [1000],
    });
    return { engine, auth, network, orchestrator };
  }

  return { drive, addDevice };
}
