import { describe, expect, it } from 'vitest';

import { WorkerEngineClient } from './WorkerEngineClient';
import type { WorkerReply, WorkerRequest } from './protocol';

class FakeWorker {
  onmessage: ((event: MessageEvent<WorkerReply>) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  readonly posted: WorkerRequest[] = [];
  constructor(private readonly respond: (request: WorkerRequest) => WorkerReply) {}

  postMessage(request: WorkerRequest): void {
    this.posted.push(request);
    queueMicrotask(() => this.onmessage?.({ data: this.respond(request) } as MessageEvent<WorkerReply>));
  }
}

function clientWith(respond: (request: WorkerRequest) => WorkerReply) {
  const worker = new FakeWorker(respond);
  return { worker, client: new WorkerEngineClient(worker as unknown as Worker) };
}

describe('WorkerEngineClient', () => {
  it('starts the engine first and resolves ready with the device id', async () => {
    const { worker, client } = clientWith((request) =>
      request.type === 'start'
        ? { id: request.id, ok: true, result: '{"deviceId":"abc"}' }
        : { id: request.id, ok: true, result: '[]' },
    );
    await expect(client.ready).resolves.toEqual({ deviceId: 'abc' });
    expect(worker.posted[0]?.type).toBe('start');
  });

  it('turns a call into one worker message and returns the parsed result', async () => {
    const { worker, client } = clientWith((request) =>
      request.type === 'start'
        ? { id: request.id, ok: true, result: '{"deviceId":"abc"}' }
        : { id: request.id, ok: true, result: '{"theme":"dark"}' },
    );
    const settings = await client.call('hub.get_settings');
    expect(settings).toEqual({ theme: 'dark' });
    expect(worker.posted[1]).toMatchObject({ type: 'call', command: 'hub.get_settings' });
  });

  it('answers concurrent calls to the right caller', async () => {
    const { client } = clientWith((request) =>
      request.type === 'start'
        ? { id: request.id, ok: true, result: '{"deviceId":"abc"}' }
        : { id: request.id, ok: true, result: JSON.stringify({ echoed: request.command }) },
    );
    const [a, b] = await Promise.all([
      client.call('hub.get_settings'),
      client.call('hub.list_notifications'),
    ]);
    expect(a).toEqual({ echoed: 'hub.get_settings' });
    expect(b).toEqual({ echoed: 'hub.list_notifications' });
  });

  it('rejects with the engine error code when the worker reports a failure', async () => {
    const { client } = clientWith((request) =>
      request.type === 'start'
        ? { id: request.id, ok: true, result: '{"deviceId":"abc"}' }
        : { id: request.id, ok: false, error: '{"code":"not_found","message":"nope"}' },
    );
    await expect(client.call('spending.get_transaction', { id: 'x' })).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('rejects ready when the database cannot be opened', async () => {
    const { client } = clientWith((request) => ({
      id: request.id,
      ok: false,
      error: '{"code":"internal","message":"storage_unavailable"}',
    }));
    await expect(client.ready).rejects.toBeDefined();
  });
});
