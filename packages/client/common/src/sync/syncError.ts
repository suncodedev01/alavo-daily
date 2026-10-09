/**
 * Why a sync round stopped. `needs_login`, `offline` and `rate_limited` are ordinary and the
 * person is told calmly; the rest are reported as a failure that can be retried.
 */
export type SyncFailureKind = 'needs_login' | 'offline' | 'rate_limited' | 'drive' | 'unknown';

export class SyncError extends Error {
  constructor(
    readonly kind: SyncFailureKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

export function toSyncError(error: unknown): SyncError {
  if (error instanceof SyncError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new SyncError('unknown', message);
}
