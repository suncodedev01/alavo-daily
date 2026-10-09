import { beforeEach, describe, expect, it, vi } from 'vitest';

const core = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => core);

import { NativeCommandError } from './commandError';
import { fetchPage } from './fetchPage';
import { createGoogleAuth } from './googleAuth';
import { saveTextFile } from './saveTextFile';

beforeEach(() => vi.resetAllMocks());

describe('saveTextFile', () => {
  it('asks the app to show the save dialog for the file', async () => {
    core.invoke.mockResolvedValue(true);
    await saveTextFile('alavo-daily-2026-10-09.json', '{"version":1}');
    expect(core.invoke).toHaveBeenCalledWith('save_text_file', {
      fileName: 'alavo-daily-2026-10-09.json',
      content: '{"version":1}',
    });
  });

  it('resolves quietly when the person cancels the dialog', async () => {
    core.invoke.mockResolvedValue(false);
    await expect(saveTextFile('a.json', '{}')).resolves.toBeUndefined();
  });

  it('rejects with the reason when the file cannot be written', async () => {
    core.invoke.mockRejectedValue('Could not write the file: access denied');
    await expect(saveTextFile('a.json', '{}')).rejects.toThrow('Could not write the file: access denied');
  });
});

describe('fetchPage', () => {
  it('returns the page text', async () => {
    core.invoke.mockResolvedValue('<html>Bún chả</html>');
    expect(await fetchPage('https://example.com/bun-cha')).toBe('<html>Bún chả</html>');
    expect(core.invoke).toHaveBeenCalledWith('fetch_page', { url: 'https://example.com/bun-cha' });
  });

  it('rejects with the typed error the app reports', async () => {
    core.invoke.mockRejectedValue({ code: 'blocked_address', message: 'This address points to a private network' });
    const failure = await fetchPage('http://192.168.1.1/').catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(NativeCommandError);
    expect(failure).toMatchObject({ code: 'blocked_address', message: 'This address points to a private network' });
  });
});

describe('Google sign-in', () => {
  it('signs in through the app and returns the account', async () => {
    core.invoke.mockResolvedValue({ email: 'an@example.com' });
    expect(await createGoogleAuth().signIn()).toEqual({ email: 'an@example.com' });
    expect(core.invoke).toHaveBeenCalledWith('google_sign_in');
  });

  it('has no session before signing in', async () => {
    core.invoke.mockResolvedValue(null);
    expect(await createGoogleAuth().session()).toBeNull();
    expect(core.invoke).toHaveBeenCalledWith('google_session');
  });

  it('returns null when the person must sign in again', async () => {
    core.invoke.mockResolvedValue(null);
    expect(await createGoogleAuth().accessToken()).toBeNull();
    expect(core.invoke).toHaveBeenCalledWith('google_access_token');
  });

  it('returns an access token for Drive', async () => {
    core.invoke.mockResolvedValue('ya29.token');
    expect(await createGoogleAuth().accessToken()).toBe('ya29.token');
  });

  it('signs out through the app', async () => {
    core.invoke.mockResolvedValue(undefined);
    await createGoogleAuth().signOut();
    expect(core.invoke).toHaveBeenCalledWith('google_sign_out');
  });

  it('rejects with a code when sign-in fails', async () => {
    core.invoke.mockRejectedValue({ code: 'timed_out', message: 'Sign-in was not finished in time' });
    await expect(createGoogleAuth().signIn()).rejects.toMatchObject({ code: 'timed_out' });
  });
});
