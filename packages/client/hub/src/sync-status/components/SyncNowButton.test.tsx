import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { aSyncStatus } from '../../testing/hubEngine';
import { renderHub, setViewportWidth } from '../../testing/renderHub';

beforeEach(() => setViewportWidth(1280));

function controller() {
  return {
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
  };
}

describe('the quick sync button on the home screen', () => {
  it('is not shown when this device cannot sign in to Google', async () => {
    renderHub('/today');
    await screen.findByRole('heading', { name: 'Chào bạn' });
    expect(screen.queryByRole('button', { name: 'Đồng bộ ngay' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kết nối với Google' })).not.toBeInTheDocument();
  });

  it('syncs right away when Google is connected', async () => {
    const sync = controller();
    renderHub('/today', { sync, state: { sync: aSyncStatus({ state: 'idle', accountEmail: 'a@b.c' }) } });
    await userEvent.click(await screen.findByRole('button', { name: 'Đồng bộ ngay' }));
    expect(sync.syncNow).toHaveBeenCalledTimes(1);
  });

  it('takes a device that is not connected to the Google settings', async () => {
    renderHub('/today', { sync: controller(), state: { sync: aSyncStatus({ state: 'off' }) } });
    await userEvent.click(await screen.findByRole('button', { name: 'Kết nối với Google' }));
    expect(await screen.findByLabelText('Đường dẫn hiện tại')).toHaveTextContent('/settings');
  });

  it('asks to sign in again when the login expired', async () => {
    const sync = controller();
    renderHub('/today', { sync, state: { sync: aSyncStatus({ state: 'needs_login' }) } });
    await userEvent.click(await screen.findByRole('button', { name: 'Đăng nhập lại Google' }));
    expect(sync.connect).toHaveBeenCalledTimes(1);
  });

  it('is disabled while a sync is running', async () => {
    renderHub('/today', { sync: controller(), state: { sync: aSyncStatus({ state: 'syncing' }) } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đồng bộ ngay' })).toBeDisabled());
  });

  it('is also on the narrow home screen', async () => {
    setViewportWidth(390);
    renderHub('/today', { sync: controller(), state: { sync: aSyncStatus({ state: 'idle' }) } });
    expect(await screen.findByRole('button', { name: 'Đồng bộ ngay' })).toBeInTheDocument();
  });
});
