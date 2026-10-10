import {
  isReadCommand,
  type ApplyRemoteInput,
  type ApplyRemoteReport,
  type CallArgs,
  type CommandName,
  type CommandResult,
  type EngineClient,
  type EngineEvent,
  type ReportSyncState,
  type SyncEvent,
  type SyncPeer,
  type SyncStatus,
} from '../../engine';

interface Entity {
  value: string | null;
  contentHlc: number;
  deletedHlc: number;
}

/**
 * The sync side of the engine, reduced to "the version with the later clock wins, and a delete
 * stands unless something was written after it". Enough to check that events moved through a
 * fake Drive bring two devices to the same state. The real merging is tested in the Rust engine.
 */
export class FakeSyncEngine implements EngineClient {
  readonly ready: Promise<{ deviceId: string }>;
  readonly calls: { command: string; payload: unknown }[] = [];
  readonly applied: string[] = [];
  private readonly entities = new Map<string, Entity>();
  private readonly events: (SyncEvent & { synced: boolean })[] = [];
  private readonly peers = new Map<string, SyncPeer>();
  private readonly listeners = new Set<(event: EngineEvent) => void>();
  private state: SyncStatus;

  constructor(
    private readonly deviceId: string,
    private readonly clock: () => number,
  ) {
    this.ready = Promise.resolve({ deviceId });
    this.state = { state: 'off', pendingEvents: 0, lastSyncedAt: null, deviceId, accountEmail: null, error: null, conflictCount: 0 };
  }

  private syncIntervalMinutes = 5;

  /** Changes the "Tự đồng bộ mỗi" setting the way the settings screen does. */
  setSyncInterval(minutes: number): void {
    this.syncIntervalMinutes = minutes;
    this.listeners.forEach((listener) => listener({ command: 'hub.update_settings' }));
  }

  write(id: string, value: string): void {
    const hlc = this.clock();
    this.take(id, { value, contentHlc: hlc, deletedHlc: 0 });
    this.log({ action: 'update', entityId: id, payload: { id, value, updated_at: hlc }, hlc });
  }

  remove(id: string): void {
    const hlc = this.clock();
    this.entities.set(id, { ...(this.entities.get(id) ?? blank()), deletedHlc: hlc });
    this.log({ action: 'delete', entityId: id, payload: { id, deleted_at: hlc }, hlc });
  }

  visible(): Record<string, string> {
    const rows: Record<string, string> = {};
    for (const [id, entity] of this.entities) {
      if (entity.value !== null && entity.contentHlc > entity.deletedHlc) rows[id] = entity.value;
    }
    return rows;
  }

  statusNow(): SyncStatus {
    return { ...this.state, pendingEvents: this.events.filter((event) => !event.synced).length };
  }

  subscribe(listener: (event: EngineEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async call<K extends CommandName>(command: K, ...args: CallArgs<K>): Promise<CommandResult<K>> {
    this.calls.push({ command, payload: args[0] });
    const result = this.run(command, args[0]);
    if (!isReadCommand(command)) this.listeners.forEach((listener) => listener({ command }));
    return result as CommandResult<K>;
  }

  private run(command: string, payload: unknown): unknown {
    switch (command) {
      case 'hub.get_settings':
        return { syncIntervalMinutes: this.syncIntervalMinutes };
      case 'sync.status':
        return this.statusNow();
      case 'sync.report_state':
        return this.report(payload as ReportSyncState);
      case 'sync.pending_events':
        return this.events.filter((event) => !event.synced).map(strip);
      case 'sync.list_own_events':
        return this.events.map(strip);
      case 'sync.mark_synced':
        return this.markSynced((payload as { eventIds: string[] }).eventIds);
      case 'sync.list_peers':
        return [...this.peers.values()];
      case 'sync.apply_remote':
        return this.applyRemote(payload as ApplyRemoteInput);
      default:
        throw new Error(`no fake for ${command}`);
    }
  }

  private report(report: ReportSyncState): SyncStatus {
    const off = report.state === 'off';
    this.state = {
      ...this.state,
      state: report.state,
      error: report.error ?? null,
      accountEmail: off ? null : (report.accountEmail ?? this.state.accountEmail),
      lastSyncedAt: report.synced ? this.clock() : off ? null : this.state.lastSyncedAt,
    };
    return this.statusNow();
  }

  private markSynced(ids: string[]): { count: number } {
    const wanted = new Set(ids);
    const hit = this.events.filter((event) => wanted.has(event.eventId));
    hit.forEach((event) => (event.synced = true));
    return { count: hit.length };
  }

  private applyRemote(input: ApplyRemoteInput): ApplyRemoteReport {
    const peer = this.peers.get(input.deviceId);
    const mark = peer?.highWaterHlc ?? 0;
    const fresh = input.events.filter(isEvent).filter((event) => event.hlc > mark).sort((a, b) => a.hlc - b.hlc);
    fresh.forEach((event) => this.merge(event));
    const highWater = fresh.reduce((high, event) => Math.max(high, event.hlc), mark);
    this.peers.set(input.deviceId, {
      deviceId: input.deviceId,
      highWaterHlc: highWater,
      marker: input.marker ?? peer?.marker ?? null,
      appliedAt: this.clock(),
    });
    return { applied: fresh.length, unchanged: 0, conflicts: 0, ignored: input.events.length - fresh.length, highWater };
  }

  private merge(event: SyncEvent): void {
    this.applied.push(event.eventId);
    const current = this.entities.get(event.entityId) ?? blank();
    if (event.action === 'delete') {
      this.entities.set(event.entityId, { ...current, deletedHlc: Math.max(current.deletedHlc, event.hlc) });
    } else if (event.hlc > current.contentHlc) {
      this.take(event.entityId, { value: String(event.payload.value), contentHlc: event.hlc, deletedHlc: current.deletedHlc });
    }
  }

  private take(id: string, entity: Entity): void {
    this.entities.set(id, { ...entity, deletedHlc: Math.max(entity.deletedHlc, this.entities.get(id)?.deletedHlc ?? 0) });
  }

  private log(change: { action: SyncEvent['action']; entityId: string; payload: Record<string, unknown>; hlc: number }): void {
    const event = {
      eventId: `${this.deviceId}-${this.events.length + 1}`,
      module: 'spending',
      entityType: 'transaction',
      changedFields: [],
      deviceId: this.deviceId,
      synced: false,
      ...change,
    };
    this.events.push(event);
    this.listeners.forEach((listener) => listener({ command: 'spending.record_transaction' }));
  }
}

function blank(): Entity {
  return { value: null, contentHlc: 0, deletedHlc: 0 };
}

function strip(event: SyncEvent & { synced: boolean }): SyncEvent {
  const { synced: _synced, ...rest } = event;
  return rest;
}

function isEvent(value: unknown): value is SyncEvent {
  const event = value as Partial<SyncEvent> | null;
  return typeof event?.eventId === 'string' && typeof event.hlc === 'number' && typeof event.payload === 'object';
}
