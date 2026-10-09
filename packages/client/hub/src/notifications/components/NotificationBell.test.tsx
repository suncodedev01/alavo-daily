import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppNotification } from '@alavo-daily/common';

import { NOW } from '../../testing/hubEngine';
import { renderHub, setViewportWidth } from '../../testing/renderHub';

function notification(id: string, overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id,
    module: 'alpha',
    title: `Thông báo ${id}`,
    body: `Nội dung ${id}`,
    subjectId: null,
    createdAt: NOW,
    read: false,
    ...overrides,
  };
}

beforeEach(() => {
  setViewportWidth(1280);
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
});

const openBell = async () => {
  const user = userEvent.setup({ advanceTimers: () => undefined });
  await user.click(await screen.findByRole('button', { name: /^Thông báo/ }));
  return user;
};

describe('bell', () => {
  it('shows the unread count in its name and a dot when something is unread', async () => {
    renderHub('/alpha/one', { state: { notifications: [notification('a'), notification('b', { read: true })] } });
    const bell = await screen.findByRole('button', { name: 'Thông báo, 1 chưa đọc' });
    expect(bell).toHaveAttribute('data-badge');
  });

  it('has no dot when everything is read', async () => {
    renderHub('/alpha/one', { state: { notifications: [notification('a', { read: true })] } });
    const bell = await screen.findByRole('button', { name: 'Thông báo' });
    expect(bell).not.toHaveAttribute('data-badge');
  });

  it('lists notifications with their module, newest first', async () => {
    renderHub('/alpha/one', {
      state: {
        notifications: [
          notification('cu', { createdAt: NOW - 3_600_000 }),
          notification('moi', { createdAt: NOW }),
        ],
      },
    });
    await openBell();
    const panel = await screen.findByRole('dialog', { name: 'Thông báo' });
    const titles = within(panel).getAllByRole('listitem').map((item) => item.querySelector('p')?.textContent);
    expect(titles).toEqual(['Thông báo moi', 'Thông báo cu']);
    expect(within(panel).getAllByText(/Alpha · /)).toHaveLength(2);
  });

  it('says so when there are no notifications', async () => {
    renderHub('/alpha/one');
    await openBell();
    expect(await screen.findByText('Chưa có thông báo nào')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đánh dấu đã đọc' })).toBeDisabled();
  });

  it('marks everything read and removes the dot', async () => {
    const { engine } = renderHub('/alpha/one', { state: { notifications: [notification('a'), notification('b')] } });
    const user = await openBell();
    await user.click(await screen.findByRole('button', { name: 'Đánh dấu đã đọc' }));
    await waitFor(() => expect(engine.callsTo('hub.mark_notifications_read')).toEqual([{}]));
    const bell = await screen.findByRole('button', { name: 'Thông báo' });
    expect(bell).not.toHaveAttribute('data-badge');
  });

  it('links to the notification settings and closes the panel', async () => {
    const user = await (async () => {
      renderHub('/alpha/one');
      return openBell();
    })();
    await user.click(await screen.findByRole('link', { name: 'Cài đặt thông báo' }));
    expect(screen.getByLabelText('Đường dẫn hiện tại')).toHaveTextContent('/settings/notifications');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Thông báo' })).not.toBeInTheDocument());
  });
});

describe('bell on a narrow layout', () => {
  it('opens the notifications in a sheet', async () => {
    setViewportWidth(390);
    renderHub('/alpha/one', { state: { notifications: [notification('a')] } });
    await openBell();
    const sheet = await screen.findByRole('dialog', { name: 'Thông báo' });
    expect(within(sheet).getByText('Thông báo a')).toBeInTheDocument();
  });
});
