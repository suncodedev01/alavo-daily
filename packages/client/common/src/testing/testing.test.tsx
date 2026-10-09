import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useEngineMutation, useEngineQuery, EngineGate, EngineProvider } from '../engine';
import { createFakePlatform, FakeEngineClient, renderWithProviders } from './index';

function Settings() {
  const settings = useEngineQuery('hub.get_settings');
  const update = useEngineMutation('hub.update_settings');
  if (!settings.data) return <p>loading</p>;
  return (
    <button onClick={() => update.mutate({ theme: 'dark' })}>{settings.data.theme}</button>
  );
}

const baseSettings = {
  language: 'vi',
  theme: 'light' as const,
  householdSize: 2,
  pinnedModules: [],
  recentModules: [],
};

describe('FakeEngineClient', () => {
  it('answers from handlers and records every call', async () => {
    const engine = new FakeEngineClient({ 'hub.get_settings': () => baseSettings });
    await engine.call('hub.get_settings');
    expect(engine.callsTo('hub.get_settings')).toHaveLength(1);
  });

  it('rejects commands without a handler', async () => {
    const engine = new FakeEngineClient();
    await expect(engine.call('hub.get_settings')).rejects.toMatchObject({ code: 'unknown_command' });
  });
});

describe('engine hooks', () => {
  it('shows query data, and refetches after a mutation', async () => {
    let theme: 'light' | 'dark' = 'light';
    const { engine } = renderWithProviders(<Settings />, {
      handlers: {
        'hub.get_settings': () => ({ ...baseSettings, theme }),
        'hub.update_settings': (update) => {
          theme = update.theme === 'dark' ? 'dark' : 'light';
          return { ...baseSettings, theme };
        },
      },
    });
    const button = await screen.findByRole('button', { name: 'light' });
    button.click();
    await waitFor(() => expect(screen.getByRole('button', { name: 'dark' })).toBeInTheDocument());
    expect(engine.callsTo('hub.update_settings')).toEqual([{ theme: 'dark' }]);
  });
});

describe('EngineGate', () => {
  it('shows the failure message when the engine cannot start', async () => {
    const engine = new FakeEngineClient();
    const failing = Object.assign(engine, { ready: Promise.reject(new Error('storage_unavailable')) });
    failing.ready.catch(() => undefined);
    renderWithProviders(
      <EngineProvider client={failing}>
        <EngineGate loading={<p>loading</p>} failed={(message) => <p>{`failed: ${message}`}</p>}>
          <p>ready</p>
        </EngineGate>
      </EngineProvider>,
    );
    expect(await screen.findByText('failed: storage_unavailable')).toBeInTheDocument();
  });

  it('shows the app once the engine is ready', async () => {
    renderWithProviders(
      <EngineGate loading={<p>loading</p>} failed={() => <p>failed</p>}>
        <p>ready</p>
      </EngineGate>,
    );
    expect(await screen.findByText('ready')).toBeInTheDocument();
  });
});

describe('createFakePlatform', () => {
  it('lets a test override one service', async () => {
    const notify = vi.fn(async () => false);
    const platform = createFakePlatform({ notify });
    expect(await platform.notify('a', 'b')).toBe(false);
    expect(platform.capabilities.keepAwake).toBe(true);
  });
});
