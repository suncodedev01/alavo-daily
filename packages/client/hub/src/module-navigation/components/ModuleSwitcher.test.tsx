import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderHub, setViewportWidth } from '../../testing/renderHub';
import { pushRecentModule } from '../logic/navigation';

beforeEach(() => setViewportWidth(1280));

const updates = (engine: { callsTo: (command: 'hub.update_settings') => unknown[] }) =>
  engine.callsTo('hub.update_settings');

describe('module switcher on a wide layout', () => {
  it('lists Today and every manifest plus a disabled add-app row', async () => {
    const user = userEvent.setup();
    renderHub('/today');
    await user.click(await screen.findByRole('button', { name: /Chuyển ứng dụng/ }));
    const menu = await screen.findByRole('menu');
    const names = within(menu).getAllByRole('menuitemradio').map((item) => item.textContent);
    expect(names).toEqual([
      'Hôm nayTổng hợp mọi ứng dụng',
      'AlphaỨng dụng thử số một',
      'BetaỨng dụng thử số hai',
    ]);
    expect(within(menu).getByRole('menuitem', { name: /Thêm ứng dụng/ })).toHaveAttribute('aria-disabled', 'true');
    expect(within(menu).getByText('Sắp có')).toBeInTheDocument();
  });

  it('marks the module of the current URL as selected', async () => {
    const user = userEvent.setup();
    renderHub('/beta/a');
    await user.click(await screen.findByRole('button', { name: /Chuyển ứng dụng: Beta/ }));
    expect(await screen.findByRole('menuitemradio', { name: /Beta/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('opens the first view of the chosen module and remembers it as recent', async () => {
    const user = userEvent.setup();
    const { engine } = renderHub('/today');
    await user.click(await screen.findByRole('button', { name: /Chuyển ứng dụng/ }));
    await user.click(await screen.findByRole('menuitemradio', { name: /Alpha/ }));
    expect(await screen.findByText('Nội dung trang một')).toBeInTheDocument();
    expect(screen.getByLabelText('Đường dẫn hiện tại')).toHaveTextContent('/alpha/one');
    expect(updates(engine)).toEqual([{ recentModules: ['alpha'] }]);
  });

  it('puts the latest module first and keeps at most four', async () => {
    const user = userEvent.setup();
    const { engine } = renderHub('/today', {
      state: {
        settings: {
          language: 'vi',
          theme: 'system',
          householdSize: 2,
          pinnedModules: [],
          recentModules: ['beta', 'x1', 'x2', 'x3'],
        },
      },
    });
    await user.click(await screen.findByRole('button', { name: /Chuyển ứng dụng/ }));
    await user.click(await screen.findByRole('menuitemradio', { name: /Alpha/ }));
    await waitFor(() => expect(updates(engine)).toHaveLength(1));
    expect(updates(engine)[0]).toEqual({ recentModules: ['alpha', 'beta', 'x1', 'x2'] });
  });

  it('does not record Today as a recent module', async () => {
    const user = userEvent.setup();
    const { engine } = renderHub('/alpha/one');
    await user.click(await screen.findByRole('button', { name: /Chuyển ứng dụng/ }));
    await user.click(await screen.findByRole('menuitemradio', { name: /Hôm nay/ }));
    expect(await screen.findByRole('heading', { name: 'Chào bạn' })).toBeInTheDocument();
    expect(updates(engine)).toEqual([]);
  });

  it('shows the pinned group only on the home module', async () => {
    renderHub('/today');
    const nav = await screen.findByRole('navigation', { name: 'Điều hướng' });
    expect(await within(nav).findByText('Đã ghim')).toBeInTheDocument();
    expect(await within(nav).findByRole('button', { name: 'Alpha' })).toBeInTheDocument();
  });

  it('does not show the pinned group inside a module', async () => {
    renderHub('/alpha/one');
    const nav = await screen.findByRole('navigation', { name: 'Điều hướng' });
    await screen.findByText('Nội dung trang một');
    expect(within(nav).queryByText('Đã ghim')).not.toBeInTheDocument();
  });
});

describe('module switcher on a narrow layout', () => {
  beforeEach(() => setViewportWidth(390));

  it('opens as a bottom sheet and switches module', async () => {
    const user = userEvent.setup();
    const { engine } = renderHub('/today');
    await user.click(await screen.findByRole('button', { name: /Chuyển ứng dụng/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Chuyển ứng dụng' });
    expect(within(sheet).getByRole('button', { name: /Thêm ứng dụng/ })).toBeDisabled();
    await user.click(within(sheet).getByRole('button', { name: /Beta/ }));
    expect(await screen.findByText('Nội dung beta')).toBeInTheDocument();
    expect(updates(engine)).toEqual([{ recentModules: ['beta'] }]);
  });
});

describe('pushRecentModule', () => {
  it('moves an existing module to the front without duplicating it', () => {
    expect(pushRecentModule(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
  });

  it('caps the list at four modules', () => {
    expect(pushRecentModule(['a', 'b', 'c', 'd'], 'e')).toEqual(['e', 'a', 'b', 'c']);
  });
});
