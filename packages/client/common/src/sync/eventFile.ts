import type { SyncEvent } from '../engine';

export const EVENT_FILE_FORMAT = 'alavo-daily-events';
export const EVENT_FILE_VERSION = 1;

const FILE_NAME = /^events-([A-Za-z0-9_-]{1,80})\.json$/;

export function eventFileName(deviceId: string): string {
  return `events-${deviceId}.json`;
}

/** The device a file belongs to, or null when the name is not one of ours. */
export function deviceIdOfFile(name: string): string | null {
  return FILE_NAME.exec(name)?.[1] ?? null;
}

/** The content of a device's file: every change that device ever made, oldest first. */
export function buildEventFile(deviceId: string, events: SyncEvent[]): string {
  return JSON.stringify({ format: EVENT_FILE_FORMAT, version: EVENT_FILE_VERSION, deviceId, events });
}

export type ParsedEventFile =
  | { ok: true; deviceId: string; events: unknown[] }
  | { ok: false; reason: 'unreadable' | 'newer_version' | 'wrong_device' };

/** Reads a downloaded file. Never throws: a damaged file is skipped, not fatal to the round. */
export function parseEventFile(text: string, expectedDeviceId: string): ParsedEventFile {
  const document = safeParse(text);
  if (!isRecord(document) || document.format !== EVENT_FILE_FORMAT || !Array.isArray(document.events)) {
    return { ok: false, reason: 'unreadable' };
  }
  if (typeof document.version !== 'number' || document.version > EVENT_FILE_VERSION) {
    return { ok: false, reason: 'newer_version' };
  }
  if (document.deviceId !== expectedDeviceId) return { ok: false, reason: 'wrong_device' };
  return { ok: true, deviceId: expectedDeviceId, events: document.events };
}

/** Oldest clock first, which is the order the engine's high-water mark expects. */
export function byClock(events: unknown[]): unknown[] {
  return [...events].sort((a, b) => clockOf(a) - clockOf(b));
}

function clockOf(event: unknown): number {
  return isRecord(event) && typeof event.hlc === 'number' ? event.hlc : 0;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
