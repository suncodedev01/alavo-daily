import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderHub, setViewportWidth } from '../../../testing/renderHub';

beforeEach(() => setViewportWidth(1280));

describe('language picker', () => {
  it('shows the language in use on the settings screen', async () => {
    renderHub('/settings/sync');
    expect(await screen.findByRole('button', { name: 'Ngôn ngữ: Tiếng Việt' })).toBeInTheDocument();
  });

  it('offers Vietnamese and English by their own names', async () => {
    const user = userEvent.setup();
    renderHub('/settings/sync');
    await user.click(await screen.findByRole('button', { name: 'Ngôn ngữ: Tiếng Việt' }));
    expect(await screen.findByRole('menuitemradio', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Tiếng Việt' })).toBeInTheDocument();
  });

  it('saves the chosen language through the engine settings', async () => {
    const user = userEvent.setup();
    const { engine, state } = renderHub('/settings/sync');
    await user.click(await screen.findByRole('button', { name: 'Ngôn ngữ: Tiếng Việt' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'English' }));
    await waitFor(() => expect(engine.callsTo('hub.update_settings')).toEqual([{ language: 'en' }]));
    expect(state.settings.language).toBe('en');
  });

  it('is written in English when the app runs in English', async () => {
    renderHub('/settings/sync', { language: 'en' });
    expect(await screen.findByRole('button', { name: 'Language: English' })).toBeInTheDocument();
  });
});
