export type WorkerRequest =
  | { id: number; type: 'start' }
  | { id: number; type: 'call'; command: string; payload: string };

export type WorkerReply =
  | { id: number; ok: true; result: string }
  | { id: number; ok: false; error: string };
