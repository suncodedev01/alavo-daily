import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { GoogleAuth, SyncController } from '@alavo-daily/common';
import { createFakePlatform, renderWithProviders } from '@alavo-daily/common/testing';

import { aSyncStatus } from '../../testing/hubEngine';
import { SyncProvider, useSyncController } from './useSyncController';

function Probe() {
  return <p>{useSyncController() ? 'can sync' : 'cannot sync'}</p>;
}

function signedOutAuth(): GoogleAuth {
  return {
    signIn: async () => ({ email: null }),
    session: async () => null,
    accessToken: async () => null,
    signOut: async () => undefined,
  };
}

function platformWith(googleAuth: GoogleAuth | null, googleSync = true) {
  const base = createFakePlatform();
  return createFakePlatform({ capabilities: { ...base.capabilities, googleSync }, googleAuth });
}

describe('SyncProvider', () => {
  it('offers no sync on a platform without Google sign-in', () => {
    renderWithProviders(
      <SyncProvider>
        <Probe />
      </SyncProvider>,
      { platform: platformWith(null, false) },
    );
    expect(screen.getByText('cannot sync')).toBeInTheDocument();
  });

  it('does not touch the engine when there is nothing to sync with', async () => {
    const { engine } = renderWithProviders(
      <SyncProvider>
        <Probe />
      </SyncProvider>,
      { platform: platformWith(null, false) },
    );
    expect(engine.calls).toHaveLength(0);
  });

  it('starts syncing on open and asks for a new sign-in when a connected device has no token', async () => {
    const report = vi.fn((_state: unknown) => aSyncStatus({ state: 'needs_login' }));
    const { engine } = renderWithProviders(
      <SyncProvider>
        <Probe />
      </SyncProvider>,
      {
        platform: platformWith(signedOutAuth()),
        handlers: {
          'sync.status': () => aSyncStatus({ state: 'idle' }),
          'sync.report_state': report,
        },
      },
    );
    expect(screen.getByText('can sync')).toBeInTheDocument();
    await waitFor(() => expect(engine.callsTo('sync.report_state')).toEqual([{ state: 'needs_login' }]));
  });

  it('stays quiet on open when sync was never turned on', async () => {
    const { engine } = renderWithProviders(
      <SyncProvider>
        <Probe />
      </SyncProvider>,
      { platform: platformWith(signedOutAuth()), handlers: { 'sync.status': () => aSyncStatus() } },
    );
    await waitFor(() => expect(engine.callsTo('sync.status')).toHaveLength(1));
    expect(engine.callsTo('sync.report_state')).toHaveLength(0);
  });

  it('uses the controller it is given instead of building one', () => {
    const controller: SyncController = {
      connect: async () => undefined,
      disconnect: async () => undefined,
      syncNow: async () => undefined,
    };
    const { engine } = renderWithProviders(
      <SyncProvider controller={controller}>
        <Probe />
      </SyncProvider>,
    );
    expect(screen.getByText('can sync')).toBeInTheDocument();
    expect(engine.calls).toHaveLength(0);
  });
});
