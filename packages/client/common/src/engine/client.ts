import type { CallArgs, CommandName, CommandResult } from './commands';

/** The error every failed command rejects with. `code` mirrors the engine's `ErrorCode`. */
export class EngineCallError extends Error {
  constructor(
    readonly code: 'db' | 'not_found' | 'validation' | 'unknown_command' | 'internal',
    message: string,
  ) {
    super(message);
    this.name = 'EngineCallError';
  }
}

export interface EngineEvent {
  command: string;
}

/**
 * The port through which every screen reaches the engine. The web build implements it with a
 * Web Worker running SQLite WASM, the Tauri build with an `invoke` call into Rust.
 */
export interface EngineClient {
  /** Resolves once the database is open and migrated; rejects with a user-readable reason. */
  readonly ready: Promise<{ deviceId: string }>;
  call<K extends CommandName>(command: K, ...args: CallArgs<K>): Promise<CommandResult<K>>;
  /** Fires after every successful command that changes data. */
  subscribe(listener: (event: EngineEvent) => void): () => void;
}

/** Turns the JSON string the engine throws into an `EngineCallError`. */
export function toEngineError(raw: unknown): EngineCallError {
  const text = typeof raw === 'string' ? raw : raw instanceof Error ? raw.message : String(raw);
  try {
    const parsed = JSON.parse(text) as { code?: string; message?: string };
    return new EngineCallError(
      (parsed.code as EngineCallError['code']) ?? 'internal',
      parsed.message ?? text,
    );
  } catch {
    return new EngineCallError('internal', text);
  }
}
