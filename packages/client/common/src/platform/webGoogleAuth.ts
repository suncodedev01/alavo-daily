import type { GoogleAuth, GoogleSession } from './index';

const GSI_URL = 'https://accounts.google.com/gsi/client';
const EXPIRY_MARGIN_MS = 60_000;
const REVOKE_WAIT_MS = 2_000;

/** Only the files the app made itself. */
export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number | string;
  error?: string;
  error_description?: string;
}

export interface GoogleTokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}

export interface GoogleOAuth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
    error_callback?: (error: { type: string; message?: string }) => void;
  }): GoogleTokenClient;
  revoke(token: string, done?: () => void): void;
}

export interface WebGoogleAuthOptions {
  clientId: string;
  /** Loads Google's sign-in script. Replaced in tests. */
  loadGoogle?: () => Promise<GoogleOAuth2>;
  now?: () => number;
}

interface HeldToken {
  value: string;
  expiresAt: number;
}

/**
 * Google sign-in for the browser (the token model). The token lives only in memory: after it
 * expires or the page reloads, `accessToken()` returns null and the person signs in again with
 * a button, because Google does not renew a browser token without them.
 */
export function createWebGoogleAuth(options: WebGoogleAuthOptions): GoogleAuth {
  const load = options.loadGoogle ?? loadGoogleIdentityScript;
  const now = options.now ?? Date.now;
  let held: HeldToken | null = null;
  let hasSignedIn = false;

  return {
    async signIn(): Promise<GoogleSession> {
      const google = await load();
      const response = await requestToken(google, options.clientId, hasSignedIn);
      held = { value: response.token, expiresAt: now() + response.expiresInMs };
      hasSignedIn = true;
      return { email: null };
    },
    async session() {
      return hasSignedIn ? { email: null } : null;
    },
    async accessToken() {
      return held && now() < held.expiresAt - EXPIRY_MARGIN_MS ? held.value : null;
    },
    async signOut() {
      const token = held?.value;
      held = null;
      hasSignedIn = false;
      if (token) await revoke(load, token);
    },
  };
}

interface GrantedToken {
  token: string;
  expiresInMs: number;
}

function requestToken(google: GoogleOAuth2, clientId: string, again: boolean): Promise<GrantedToken> {
  return new Promise((resolve, reject) => {
    const client = google.initTokenClient({
      client_id: clientId,
      scope: DRIVE_FILE_SCOPE,
      callback: (response) => {
        if (response.access_token) {
          resolve({ token: response.access_token, expiresInMs: Number(response.expires_in ?? 3600) * 1000 });
        } else {
          reject(new Error(response.error ?? 'google_sign_in_failed'));
        }
      },
      error_callback: (error) => reject(new Error(error.type)),
    });
    client.requestAccessToken(again ? { prompt: '' } : undefined);
  });
}

async function revoke(load: () => Promise<GoogleOAuth2>, token: string): Promise<void> {
  try {
    const google = await load();
    await new Promise<void>((done) => {
      google.revoke(token, done);
      setTimeout(done, REVOKE_WAIT_MS);
    });
  } catch {
    return;
  }
}

let loading: Promise<GoogleOAuth2> | null = null;

/** Adds Google's sign-in script to the page the first time it is needed. */
export function loadGoogleIdentityScript(): Promise<GoogleOAuth2> {
  loading ??= new Promise<GoogleOAuth2>((resolve, reject) => {
    const present = readGoogle();
    if (present) return resolve(present);
    const script = document.createElement('script');
    script.src = GSI_URL;
    script.async = true;
    script.onload = () => {
      const google = readGoogle();
      return google ? resolve(google) : reject(new Error('google_script_unavailable'));
    };
    script.onerror = () => reject(new Error('google_script_unavailable'));
    document.head.append(script);
  }).catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}

function readGoogle(): GoogleOAuth2 | null {
  const scope = window as unknown as { google?: { accounts?: { oauth2?: GoogleOAuth2 } } };
  return scope.google?.accounts?.oauth2 ?? null;
}
