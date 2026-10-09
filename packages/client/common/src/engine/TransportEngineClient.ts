import { toEngineError, type EngineClient, type EngineEvent } from './client';
import { isReadCommand, type CallArgs, type CommandName, type CommandResult } from './commands';

/**
 * Everything the worker client and the Tauri client share: JSON in and out, error mapping,
 * and telling subscribers when data changed. Subclasses only provide `send`.
 */
export abstract class TransportEngineClient implements EngineClient {
  abstract readonly ready: Promise<{ deviceId: string }>;
  private readonly listeners = new Set<(event: EngineEvent) => void>();

  /** Delivers one command to the engine and resolves with its JSON result text. */
  protected abstract send(command: string, payloadJson: string): Promise<string>;

  async call<K extends CommandName>(command: K, ...args: CallArgs<K>): Promise<CommandResult<K>> {
    await this.ready;
    const payload = args[0];
    const raw = await this.sendMapped(command, payload === undefined ? '' : JSON.stringify(payload));
    if (!isReadCommand(command)) this.emit({ command });
    return (raw ? JSON.parse(raw) : undefined) as CommandResult<K>;
  }

  subscribe(listener: (event: EngineEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async sendMapped(command: string, payloadJson: string): Promise<string> {
    try {
      return await this.send(command, payloadJson);
    } catch (error) {
      throw toEngineError(error);
    }
  }

  private emit(event: EngineEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}
