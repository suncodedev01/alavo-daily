import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { EngineClient } from '@alavo-daily/common';
import { createFakePlatform } from '@alavo-daily/common/testing';

import { createHubEngine, type HubState } from '../../testing/hubEngine';
import { TEST_MODULES, setViewportWidth } from '../../testing/renderHub';
import { AlavoApp } from './AlavoApp';

beforeEach(() => {
  setViewportWidth(1280);
  window.location.hash = '';
});
afterEach(() => {
  document.documentElement.lang = '';
});

function renderApp(engine: EngineClient) {
  return render(<AlavoApp engine={engine} platform={createFakePlatform()} modules={TEST_MODULES} />);
}

function withLanguage(language: string): Partial<HubState> {
  return {
    settings: { language, theme: 'system', householdSize: 2, pinnedModules: [], recentModules: [] },
  };
}

describe('app language', () => {
  it('shows the Today screen in English when the settings say English', async () => {
    renderApp(createHubEngine(withLanguage('en')).engine);
    expect(await screen.findByRole('heading', { name: 'Hello' })).toBeInTheDocument();
    expect(await screen.findByText('No dishes planned for today yet')).toBeInTheDocument();
    expect(screen.queryByText('Chào bạn')).not.toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });

  it('keeps Vietnamese for an unsupported language code', async () => {
    renderApp(createHubEngine(withLanguage('fr')).engine);
    expect(await screen.findByRole('heading', { name: 'Chào bạn' })).toBeInTheDocument();
  });

  it('switches the whole app to English right after picking it in Settings', async () => {
    const user = userEvent.setup();
    const { engine, state } = createHubEngine(withLanguage('vi'));
    window.location.hash = '#/settings/sync';
    renderApp(engine);
    await user.click(await screen.findByRole('button', { name: 'Ngôn ngữ: Tiếng Việt' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'English' }));
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Language: English' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navigation' })).toBeInTheDocument();
    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
    expect(state.settings.language).toBe('en');
  });

  it('switches back to Vietnamese', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/settings/sync';
    renderApp(createHubEngine(withLanguage('en')).engine);
    await user.click(await screen.findByRole('button', { name: 'Language: English' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'Tiếng Việt' }));
    expect(await screen.findByRole('heading', { name: 'Cài đặt' })).toBeInTheDocument();
  });
});
