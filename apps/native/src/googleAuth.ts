import type { GoogleAuth, GoogleSession } from '@alavo-daily/common';
import { invoke } from '@tauri-apps/api/core';

import { callCommand } from './commandError';

export function createGoogleAuth(): GoogleAuth {
  return {
    signIn: () => callCommand(() => invoke<GoogleSession>('google_sign_in')),
    session: () => callCommand(() => invoke<GoogleSession | null>('google_session')),
    accessToken: () => callCommand(() => invoke<string | null>('google_access_token')),
    signOut: () => callCommand(() => invoke<void>('google_sign_out')),
  };
}
