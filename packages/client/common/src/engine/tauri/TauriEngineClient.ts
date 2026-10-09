import { invoke } from '@tauri-apps/api/core';

import { TransportEngineClient } from '../TransportEngineClient';

/** The native build's engine: the Rust engine runs in the app process, reached by `invoke`. */
export class TauriEngineClient extends TransportEngineClient {
  readonly ready: Promise<{ deviceId: string }> = invoke<string>('engine_start').then(
    (raw) => JSON.parse(raw) as { deviceId: string },
  );

  protected send(command: string, payload: string): Promise<string> {
    return invoke<string>('engine_call', { command, payload });
  }
}
