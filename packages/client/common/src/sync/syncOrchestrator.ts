import type { EngineClient, ReportSyncState } from '../engine';
import type { GoogleAuth } from '../platform';
import { DriveClient } from './driveClient';
import type { FetchLike } from './driveHttp';
import { runSyncRound } from './syncRound';
import { SyncError, toSyncError } from './syncError';

const DEBOUNCE_MS = 5_000;
const POLL_MS = 5 * 60_000;
const RETRY_DELAYS_MS = [15_000, 60_000, 300_000];
/** Commands sync itself issues. Reacting to them would make sync trigger sync. */
const SYNC_BOOKKEEPING = new Set(['sync.report_state', 'sync.apply_remote', 'sync.mark_synced']);

/** What the screens can ask sync to do. */
export interface SyncController {
  /** Opens Google sign-in, then syncs. Also the way back after "needs login". */
  connect(): Promise<void>;
  /** Stops syncing and forgets the Google account. Data on this device is kept. */
  disconnect(): Promise<void>;
  syncNow(): Promise<void>;
}

export interface NetworkWatch {
  isOnline(): boolean;
  onOnline(listener: () => void): () => void;
}

export interface OrchestratorOptions {
  engine: EngineClient;
  auth: GoogleAuth;
  fetch: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  network?: NetworkWatch;
  debounceMs?: number;
  pollMs?: number;
  retryDelaysMs?: number[];
}

type Timer = ReturnType<typeof setTimeout>;

/**
 * Decides when to sync: on open, shortly after a local change, when the network comes back, on
 * a slow timer, and on request. It never blocks the screens, and it reports every state change
 * to the engine so each screen reads the same status.
 */
export class SyncOrchestrator implements SyncController {
  private readonly engine: EngineClient;
  private readonly auth: GoogleAuth;
  private readonly drive: DriveClient;
  private readonly network: NetworkWatch;
  private folderId: string | null = null;
  private running: Promise<void> | null = null;
  private rerun = false;
  private failures = 0;
  private soonTimer: Timer | undefined;
  private retryTimer: Timer | undefined;

  constructor(private readonly options: OrchestratorOptions) {
    this.engine = options.engine;
    this.auth = options.auth;
    this.network = options.network ?? browserNetwork();
    this.drive = new DriveClient({
      fetch: options.fetch,
      sleep: options.sleep,
      accessToken: () => options.auth.accessToken(),
    });
  }

  /** Starts watching for reasons to sync. Returns the function that stops it. */
  start(): () => void {
    const stops = [
      this.engine.subscribe((event) => !SYNC_BOOKKEEPING.has(event.command) && this.syncSoon()),
      this.network.onOnline(() => void this.syncNow()),
      this.startPolling(),
    ];
    void this.resume();
    return () => {
      stops.forEach((stop) => stop());
      clearTimeout(this.soonTimer);
      clearTimeout(this.retryTimer);
    };
  }

  async connect(): Promise<void> {
    const session = await this.auth.signIn();
    const accountEmail = session.email ?? (await this.lookUpEmail());
    this.failures = 0;
    await this.report({ state: 'idle', accountEmail });
    await this.syncNow();
  }

  async disconnect(): Promise<void> {
    clearTimeout(this.soonTimer);
    clearTimeout(this.retryTimer);
    this.folderId = null;
    await this.auth.signOut().catch(() => undefined);
    await this.report({ state: 'off' });
  }

  syncNow(): Promise<void> {
    if (this.running) {
      this.rerun = true;
      return this.running;
    }
    this.running = this.runOnce()
      .catch(() => undefined)
      .finally(() => {
        this.running = null;
        if (this.rerun) {
          this.rerun = false;
          void this.syncNow();
        }
      });
    return this.running;
  }

  private async resume(): Promise<void> {
    const status = await this.engine.call('sync.status');
    if (status.state !== 'off') await this.syncNow();
  }

  private startPolling(): () => void {
    const interval = this.options.pollMs ?? POLL_MS;
    if (interval <= 0) return () => undefined;
    const timer = setInterval(() => void this.syncNow(), interval);
    return () => clearInterval(timer);
  }

  private syncSoon(): void {
    clearTimeout(this.soonTimer);
    this.soonTimer = setTimeout(() => void this.syncIfChangesWait(), this.options.debounceMs ?? DEBOUNCE_MS);
  }

  private async syncIfChangesWait(): Promise<void> {
    const status = await this.engine.call('sync.status');
    if (status.state !== 'off' && status.state !== 'needs_login' && status.pendingEvents > 0) {
      await this.syncNow();
    }
  }

  private async runOnce(): Promise<void> {
    const status = await this.engine.call('sync.status');
    if (status.state === 'off') return;
    const blocked = await this.blockedState();
    if (blocked) return blocked === status.state ? undefined : this.report({ state: blocked });
    await this.report({ state: 'syncing' });
    try {
      await this.round(status.deviceId);
      this.failures = 0;
      await this.report({ state: 'idle', synced: true });
    } catch (error) {
      await this.fail(toSyncError(error));
    }
  }

  private async blockedState(): Promise<'offline' | 'needs_login' | null> {
    if (!this.network.isOnline()) return 'offline';
    return (await this.auth.accessToken()) ? null : 'needs_login';
  }

  private async round(deviceId: string): Promise<void> {
    try {
      await runSyncRound({ engine: this.engine, drive: this.drive, deviceId, folderId: await this.folder() });
    } catch (error) {
      if (!(error instanceof SyncError) || error.status !== 404) throw error;
      this.folderId = null;
      await runSyncRound({ engine: this.engine, drive: this.drive, deviceId, folderId: await this.folder() });
    }
  }

  private async folder(): Promise<string> {
    this.folderId ??= await this.drive.ensureFolder();
    return this.folderId;
  }

  private async fail(error: SyncError): Promise<void> {
    if (error.kind === 'needs_login') return this.report({ state: 'needs_login' });
    this.scheduleRetry();
    if (error.kind === 'offline') return this.report({ state: 'offline' });
    return this.report({ state: 'error', error: error.kind });
  }

  private scheduleRetry(): void {
    const delays = this.options.retryDelaysMs ?? RETRY_DELAYS_MS;
    const wait = delays[Math.min(this.failures, delays.length - 1)] ?? RETRY_DELAYS_MS[0]!;
    this.failures += 1;
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => void this.syncNow(), wait);
  }

  private async lookUpEmail(): Promise<string | null> {
    return this.drive.accountEmail().catch(() => null);
  }

  private async report(state: ReportSyncState): Promise<void> {
    await this.engine.call('sync.report_state', state);
  }
}

function browserNetwork(): NetworkWatch {
  return {
    isOnline: () => typeof navigator === 'undefined' || navigator.onLine !== false,
    onOnline: (listener) => {
      if (typeof window === 'undefined') return () => undefined;
      window.addEventListener('online', listener);
      return () => window.removeEventListener('online', listener);
    },
  };
}
