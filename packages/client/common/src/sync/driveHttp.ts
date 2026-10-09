import { SyncError } from './syncError';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface DriveHttpOptions {
  fetch: FetchLike;
  /** An access token, or null when the person has to sign in to Google again. */
  accessToken: () => Promise<string | null>;
  /** Waits between retries. Replaced in tests so they do not really wait. */
  sleep?: (ms: number) => Promise<void>;
}

const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 500;
const LONGEST_WAIT_MS = 30_000;
const RATE_LIMIT_REASONS = ['rateLimitExceeded', 'userRateLimitExceeded'];

/**
 * Sends authorized requests to Drive. Rate limits and server errors are retried with a growing
 * pause; a 401 means the person must sign in again; a network failure means offline.
 */
export class DriveHttp {
  constructor(private readonly options: DriveHttpOptions) {}

  async json<T>(url: string, init?: RequestInit): Promise<T> {
    return (await this.request(url, init)).json() as Promise<T>;
  }

  async text(url: string, init?: RequestInit): Promise<string> {
    return (await this.request(url, init)).text();
  }

  async request(url: string, init: RequestInit = {}): Promise<Response> {
    for (let attempt = 1; ; attempt += 1) {
      const response = await this.send(url, init);
      if (response.ok) return response;
      const wait = await retryDelay(response, attempt);
      if (wait === null) throw await failureOf(response);
      await (this.options.sleep ?? pause)(wait);
    }
  }

  private async send(url: string, init: RequestInit): Promise<Response> {
    const token = await this.options.accessToken();
    if (!token) throw new SyncError('needs_login', 'Not signed in to Google');
    const headers = { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` };
    try {
      return await this.options.fetch(url, { ...init, headers });
    } catch {
      throw new SyncError('offline', 'Google Drive cannot be reached');
    }
  }
}

async function retryDelay(response: Response, attempt: number): Promise<number | null> {
  if (attempt >= MAX_ATTEMPTS) return null;
  const retriable =
    response.status === 429 || response.status >= 500 || (await isRateLimited(response));
  if (!retriable) return null;
  const asked = Number(response.headers.get('Retry-After')) * 1000;
  if (Number.isFinite(asked) && asked > 0) return Math.min(asked, LONGEST_WAIT_MS);
  return BASE_DELAY_MS * 2 ** (attempt - 1);
}

async function isRateLimited(response: Response): Promise<boolean> {
  if (response.status !== 403) return false;
  try {
    const body = (await response.clone().json()) as { error?: { errors?: { reason?: string }[] } };
    return (body.error?.errors ?? []).some((item) => RATE_LIMIT_REASONS.includes(item.reason ?? ''));
  } catch {
    return false;
  }
}

async function failureOf(response: Response): Promise<SyncError> {
  const { status } = response;
  if (status === 401) return new SyncError('needs_login', 'Google rejected the sign-in', status);
  if (status === 429 || (await isRateLimited(response))) {
    return new SyncError('rate_limited', 'Google Drive asked to slow down', status);
  }
  return new SyncError('drive', `Google Drive answered ${status}`, status);
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
