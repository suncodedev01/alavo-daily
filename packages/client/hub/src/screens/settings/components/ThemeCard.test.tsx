import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderHub, setViewportWidth } from '../../../testing/renderHub';

beforeEach(() => setViewportWidth(1280));

describe('theme picker in settings', () => {
  it('offers light, dark and match device', async () => {
    renderHub('/settings/sync');
    expect(await screen.findByRole('radio', { name: 'Nền sáng' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Nền tối' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Theo thiết bị' })).toBeInTheDocument();
  });

  it('marks the theme in use', async () => {
    renderHub('/settings/sync', {
      state: { settings: { language: 'vi', theme: 'dark', householdSize: 2, pinnedModules: [], recentModules: [] } },
    });
    const dark = await screen.findByRole('radio', { name: 'Nền tối' });
    await waitFor(() => expect(dark).toBeChecked());
  });

  it('saves the chosen theme and applies it to the page', async () => {
    const { engine, state } = renderHub('/settings/sync');
    await userEvent.click(await screen.findByRole('radio', { name: 'Nền tối' }));
    await waitFor(() => expect(engine.callsTo('hub.update_settings')).toEqual([{ theme: 'dark' }]));
    expect(state.settings.theme).toBe('dark');
  });

  it('is on the narrow settings screen too', async () => {
    setViewportWidth(390);
    renderHub('/settings/notifications');
    expect(await screen.findByRole('radio', { name: 'Nền sáng' })).toBeInTheDocument();
  });

  it('stretches the choices across the card on a phone', async () => {
    setViewportWidth(390);
    renderHub('/settings/notifications');
    const group = (await screen.findByRole('radio', { name: 'Nền sáng' })).closest('[role=radiogroup]');
    expect(group?.className).toContain('max-lg:justify-self-stretch');
  });
});
