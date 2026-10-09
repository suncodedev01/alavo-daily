import type { ApplyRemoteReport, EngineClient } from '../engine';
import type { DriveClient, DriveEventFile } from './driveClient';
import { buildEventFile, byClock, parseEventFile } from './eventFile';

const BATCH_SIZE = 200;

export interface RoundContext {
  engine: EngineClient;
  drive: DriveClient;
  deviceId: string;
  folderId: string;
}

export interface RoundSummary {
  applied: number;
  conflicts: number;
  uploaded: number;
  skippedFiles: number;
}

/**
 * One pass of sync: read what the other devices wrote, then write this device's own file.
 * The engine does the merging; this only moves events between Drive and the engine.
 */
export async function runSyncRound(context: RoundContext): Promise<RoundSummary> {
  const files = await context.drive.listEventFiles(context.folderId);
  const pulled = await pullPeers(context, files);
  const ownFile = files.find((file) => file.deviceId === context.deviceId);
  const uploaded = await pushOwnEvents(context, ownFile);
  return { ...pulled, uploaded };
}

type PullSummary = Pick<RoundSummary, 'applied' | 'conflicts' | 'skippedFiles'>;

async function pullPeers(context: RoundContext, files: DriveEventFile[]): Promise<PullSummary> {
  const peers = await context.engine.call('sync.list_peers');
  const seen = new Map(peers.map((peer) => [peer.deviceId, peer.marker]));
  const summary: PullSummary = { applied: 0, conflicts: 0, skippedFiles: 0 };
  for (const file of files) {
    if (file.deviceId === context.deviceId || seen.get(file.deviceId) === file.marker) continue;
    const report = await pullFile(context, file);
    summary.applied += report?.applied ?? 0;
    summary.conflicts += report?.conflicts ?? 0;
    summary.skippedFiles += report ? 0 : 1;
  }
  return summary;
}

async function pullFile(
  context: RoundContext,
  file: DriveEventFile,
): Promise<ApplyRemoteReport | null> {
  const parsed = parseEventFile(await context.drive.download(file.id), file.deviceId);
  if (!parsed.ok) {
    if (parsed.reason === 'unreadable') await rememberFile(context.engine, file);
    return null;
  }
  return applyInBatches(context.engine, file, byClock(parsed.events));
}

function rememberFile(engine: EngineClient, file: DriveEventFile) {
  return engine.call('sync.apply_remote', { deviceId: file.deviceId, events: [], marker: file.marker });
}

async function applyInBatches(
  engine: EngineClient,
  file: DriveEventFile,
  events: unknown[],
): Promise<ApplyRemoteReport> {
  const batches = chunk(events, BATCH_SIZE);
  const total: ApplyRemoteReport = { applied: 0, conflicts: 0, unchanged: 0, ignored: 0, highWater: 0 };
  for (const [index, batch] of batches.entries()) {
    const isLast = index === batches.length - 1;
    const marker = isLast ? file.marker : undefined;
    const report = await engine.call('sync.apply_remote', { deviceId: file.deviceId, events: batch, marker });
    total.applied += report.applied;
    total.conflicts += report.conflicts;
    total.highWater = report.highWater;
  }
  return total;
}

async function pushOwnEvents(
  context: RoundContext,
  ownFile: DriveEventFile | undefined,
): Promise<number> {
  const pending = await context.engine.call('sync.pending_events');
  if (pending.length === 0 && ownFile) return 0;
  const everything = await context.engine.call('sync.list_own_events');
  if (everything.length === 0) return 0;
  const content = buildEventFile(context.deviceId, everything);
  await context.drive.saveEventFile(context.folderId, context.deviceId, ownFile?.id ?? null, content);
  await context.engine.call('sync.mark_synced', { eventIds: pending.map((event) => event.eventId) });
  return pending.length;
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let start = 0; start < items.length; start += size) batches.push(items.slice(start, start + size));
  return batches.length > 0 ? batches : [[]];
}
