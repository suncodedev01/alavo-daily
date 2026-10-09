/// <reference lib="webworker" />
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import initEngine, { engine_call, engine_start } from '@alavo-daily/engine';
import engineWasmUrl from '@alavo-daily/engine/engine_bg.wasm?url';

import type { WorkerReply, WorkerRequest } from './protocol';

const DATABASE_PATH = '/alavo-daily.sqlite3';
const TAB_LOCK = 'alavo-daily-database';

interface SqliteDb {
  exec(options: string | Record<string, unknown>): unknown;
  changes(): number;
}

let database: SqliteDb | null = null;
let booting: Promise<string> | null = null;

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  void handle(event.data);
};

async function handle(request: WorkerRequest): Promise<void> {
  try {
    const result =
      request.type === 'start' ? await start() : (await start(), engine_call(request.command, request.payload));
    reply({ id: request.id, ok: true, result });
  } catch (error) {
    reply({ id: request.id, ok: false, error: describe(error) });
  }
}

function start(): Promise<string> {
  booting ??= boot();
  return booting;
}

async function boot(): Promise<string> {
  await claimTab();
  database = await openDatabase();
  const host = globalThis as unknown as Record<string, unknown>;
  host.__alavo_db = runDatabaseCall;
  host.__alavo_uuid = () => crypto.randomUUID();
  await initEngine({ module_or_path: engineWasmUrl });
  return engine_start();
}

/** The persistent SQLite file allows one connection, so a second tab must be told clearly. */
async function claimTab(): Promise<void> {
  const claimed = await new Promise<boolean>((resolve) => {
    void navigator.locks.request(TAB_LOCK, { ifAvailable: true }, (lock) => {
      resolve(lock !== null);
      return lock ? new Promise<void>(() => undefined) : undefined;
    });
  });
  if (!claimed) throw new Error(JSON.stringify({ code: 'internal', message: 'already_open_in_another_tab' }));
}

async function openDatabase(): Promise<SqliteDb> {
  const sqlite3 = await sqlite3InitModule();
  try {
    const pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'alavo-daily-pool', clearOnInit: false });
    return new pool.OpfsSAHPoolDb(DATABASE_PATH) as unknown as SqliteDb;
  } catch (error) {
    throw new Error(JSON.stringify({ code: 'internal', message: `storage_unavailable: ${describe(error)}` }));
  }
}

/** The three operations the Rust engine asks of its host. Results are JSON text. */
function runDatabaseCall(op: string, sql: string, paramsJson: string): string {
  const db = database;
  if (!db) throw new Error('database is not open');
  const bind = JSON.parse(paramsJson) as unknown[];
  if (op === 'batch') {
    db.exec(sql);
    return '{}';
  }
  if (op === 'execute') {
    db.exec({ sql, bind });
    return JSON.stringify({ changes: db.changes() });
  }
  const columns: string[] = [];
  const rows = db.exec({ sql, bind, rowMode: 'array', returnValue: 'resultRows', columnNames: columns });
  return JSON.stringify({ columns, rows });
}

function reply(message: WorkerReply): void {
  self.postMessage(message);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
