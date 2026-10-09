import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWebPlatform } from './web';
import {
  DRIVE_FILE_SCOPE,
  createWebGoogleAuth,
  loadGoogleIdentityScript,
  type GoogleOAuth2,
  type GoogleTokenResponse,
} from './webGoogleAuth';

interface FakeGoogle extends GoogleOAuth2 {
  configs: { client_id: string; scope: string }[];
  prompts: (string | undefined)[];
  revoked: string[];
  respondWith: GoogleTokenResponse | { popup: string };
}

function fakeGoogle(response: FakeGoogle['respondWith'] = { access_token: 'token-1', expires_in: 3600 }): FakeGoogle {
  const google: FakeGoogle = {
    configs: [],
    prompts: [],
    revoked: [],
    respondWith: response,
    initTokenClient(config) {
      google.configs.push({ client_id: config.client_id, scope: config.scope });
      return {
        requestAccessToken(overrides) {
          google.prompts.push(overrides?.prompt);
          if ('popup' in google.respondWith) config.error_callback?.({ type: google.respondWith.popup });
          else config.callback(google.respondWith);
        },
      };
    },
    revoke(token, done) {
      google.revoked.push(token);
      done?.();
    },
  };
  return google;
}

function authWith(google: FakeGoogle, clock = { now: 1_000_000 }) {
  return { clock, auth: createWebGoogleAuth({ clientId: 'web-client', loadGoogle: async () => google, now: () => clock.now }) };
}

afterEach(() => {
  document.head.querySelectorAll('script').forEach((script) => script.remove());
  vi.restoreAllMocks();
});

describe('web Google sign-in', () => {
  it('asks only for the drive.file scope with the configured client id', async () => {
    const google = fakeGoogle();
    await authWith(google).auth.signIn();
    expect(google.configs).toEqual([{ client_id: 'web-client', scope: DRIVE_FILE_SCOPE }]);
    expect(DRIVE_FILE_SCOPE).toBe('https://www.googleapis.com/auth/drive.file');
  });

  it('keeps the token in memory and hands it out until shortly before it expires', async () => {
    const { auth, clock } = authWith(fakeGoogle());
    expect(await auth.accessToken()).toBeNull();
    await auth.signIn();
    expect(await auth.accessToken()).toBe('token-1');
    clock.now += 3_500_000;
    expect(await auth.accessToken()).toBe('token-1');
    clock.now += 100_000;
    expect(await auth.accessToken()).toBeNull();
  });

  it('never writes the token to browser storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    await authWith(fakeGoogle()).auth.signIn();
    expect(setItem).not.toHaveBeenCalled();
    expect(JSON.stringify(Object.entries(localStorage))).not.toContain('token-1');
  });

  it('reports a session after sign-in and none before', async () => {
    const { auth } = authWith(fakeGoogle());
    expect(await auth.session()).toBeNull();
    await auth.signIn();
    expect(await auth.session()).toEqual({ email: null });
  });

  it('shows the account chooser only the first time and skips it when signing in again', async () => {
    const google = fakeGoogle();
    const { auth, clock } = authWith(google);
    await auth.signIn();
    clock.now += 4_000_000;
    await auth.signIn();
    expect(google.prompts).toEqual([undefined, '']);
  });

  it('rejects when the person closes the window and holds no token', async () => {
    const { auth } = authWith(fakeGoogle({ popup: 'popup_closed' }));
    await expect(auth.signIn()).rejects.toThrow('popup_closed');
    expect(await auth.accessToken()).toBeNull();
  });

  it('rejects when Google answers with an error', async () => {
    const { auth } = authWith(fakeGoogle({ error: 'access_denied' }));
    await expect(auth.signIn()).rejects.toThrow('access_denied');
  });

  it('revokes the token and forgets it on sign-out', async () => {
    const google = fakeGoogle();
    const { auth } = authWith(google);
    await auth.signIn();
    await auth.signOut();
    expect(google.revoked).toEqual(['token-1']);
    expect(await auth.accessToken()).toBeNull();
    expect(await auth.session()).toBeNull();
  });

  it('signs out even when Google cannot be reached', async () => {
    const { auth } = authWith(fakeGoogle());
    await auth.signIn();
    const offline = createWebGoogleAuth({ clientId: 'x', loadGoogle: async () => Promise.reject(new Error('down')) });
    await expect(offline.signOut()).resolves.toBeUndefined();
    await expect(auth.signOut()).resolves.toBeUndefined();
  });
});

describe('Google sign-in script', () => {
  it('is added to the page only when needed and waits for it to load', async () => {
    expect(document.querySelector('script[src*="accounts.google.com"]')).toBeNull();
    const loading = loadGoogleIdentityScript();
    const script = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]')!;
    expect(script).not.toBeNull();
    const google = fakeGoogle();
    (window as unknown as { google: unknown }).google = { accounts: { oauth2: google } };
    script.onload?.(new Event('load'));
    expect(await loading).toBe(google);
    expect(loadGoogleIdentityScript()).toBe(loading);
    delete (window as unknown as { google?: unknown }).google;
  });
});

describe('the web platform', () => {
  it('turns Google sync off and offers no sign-in when no client id is configured', () => {
    const platform = createWebPlatform({ googleClientId: '' });
    expect(platform.capabilities.googleSync).toBe(false);
    expect(platform.googleAuth).toBeNull();
  });

  it('turns Google sync on with a client id and signs in through the injected loader', async () => {
    const google = fakeGoogle();
    const platform = createWebPlatform({ googleClientId: 'abc.apps.googleusercontent.com', loadGoogle: async () => google });
    expect(platform.capabilities.googleSync).toBe(true);
    await platform.googleAuth!.signIn();
    expect(google.configs[0]?.client_id).toBe('abc.apps.googleusercontent.com');
  });

  it('treats a client id of only spaces as missing', () => {
    expect(createWebPlatform({ googleClientId: '   ' }).capabilities.googleSync).toBe(false);
  });
});
