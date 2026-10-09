import { TransportEngineClient } from '../TransportEngineClient';
import type { WorkerReply, WorkerRequest } from './protocol';

interface Pending {
  resolve: (result: string) => void;
  reject: (error: unknown) => void;
}

/** The web build's engine: SQLite WASM and the Rust engine live in a dedicated Web Worker. */
export class WorkerEngineClient extends TransportEngineClient {
  readonly ready: Promise<{ deviceId: string }>;
  private readonly worker: Worker;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;

  constructor(worker?: Worker) {
    super();
    this.worker = worker ?? new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event: MessageEvent<WorkerReply>) => this.settle(event.data);
    this.worker.onerror = (event) => this.failAll(event.message);
    this.ready = this.request({ type: 'start' }).then((raw) => JSON.parse(raw) as { deviceId: string });
  }

  protected send(command: string, payload: string): Promise<string> {
    return this.request({ type: 'call', command, payload });
  }

  private request(message: DistributiveOmit<WorkerRequest, 'id'>): Promise<string> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...message, id } as WorkerRequest);
    });
  }

  private settle(reply: WorkerReply): void {
    const pending = this.pending.get(reply.id);
    if (!pending) return;
    this.pending.delete(reply.id);
    if (reply.ok) pending.resolve(reply.result);
    else pending.reject(reply.error);
  }

  private failAll(reason: string): void {
    this.pending.forEach((pending) => pending.reject(reason));
    this.pending.clear();
  }
}

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
