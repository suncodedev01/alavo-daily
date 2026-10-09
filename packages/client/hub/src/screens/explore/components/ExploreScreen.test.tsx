import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderHub, setViewportWidth } from '../../../testing/renderHub';
import { COMING_APPS, filterQuickActions, matchesQuery, togglePinned } from '../logic/explore';

beforeEach(() => setViewportWidth(1280));

const identity = (key: string) => key;

describe('Explore screen', () => {
  it('lists every registered app and the coming-soon apps', async () => {
    renderHub('/explore');
    expect(await screen.findByRole('button', { name: 'Mở Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở Beta' })).toBeInTheDocument();
    expect(screen.getByText(`${COMING_APPS.length} ứng dụng`)).toBeInTheDocument();
    expect(screen.getByText('Công việc')).toBeInTheDocument();
  });

  it('filters apps and coming-soon entries by what was typed', async () => {
    const user = userEvent.setup();
    renderHub('/explore');
    await user.type(await screen.findByRole('searchbox', { name: 'Tìm ứng dụng' }), 'alpha');
    expect(screen.getByRole('button', { name: 'Mở Alpha' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mở Beta' })).not.toBeInTheDocument();
    expect(screen.queryByText('Công việc')).not.toBeInTheDocument();
  });

  it('says when nothing matches', async () => {
    const user = userEvent.setup();
    renderHub('/explore');
    await user.type(await screen.findByRole('searchbox', { name: 'Tìm ứng dụng' }), 'zzzz');
    expect(screen.getAllByText('Không có ứng dụng nào khớp.')).toHaveLength(2);
  });

  it('finds quick actions by their label', async () => {
    const user = userEvent.setup();
    renderHub('/explore');
    await user.type(await screen.findByRole('searchbox', { name: 'Tìm ứng dụng' }), 'việc mới');
    await user.click(await screen.findByRole('button', { name: /Việc mới của Alpha/ }));
    expect(screen.getByLabelText('Đường dẫn hiện tại')).toHaveTextContent('/alpha/one?new=1');
  });

  it('shows recent apps only while not searching', async () => {
    const user = userEvent.setup();
    renderHub('/explore', {
      state: {
        settings: {
          language: 'vi',
          theme: 'system',
          householdSize: 2,
          pinnedModules: [],
          recentModules: ['beta', 'alpha'],
        },
      },
    });
    expect(await screen.findByText('Gần đây')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { pressed: undefined, name: /^(Alpha|Beta)$/ }).map((b) => b.textContent)).toEqual([
      'Beta',
      'Alpha',
    ]);
    await user.type(screen.getByRole('searchbox', { name: 'Tìm ứng dụng' }), 'a');
    expect(screen.queryByText('Gần đây')).not.toBeInTheDocument();
  });

  it('opens an app from its Open button and records it as recent', async () => {
    const user = userEvent.setup();
    const { engine } = renderHub('/explore');
    await user.click(await screen.findByRole('button', { name: 'Mở Beta' }));
    expect(await screen.findByText('Nội dung beta')).toBeInTheDocument();
    expect(engine.callsTo('hub.update_settings')).toEqual([{ recentModules: ['beta'] }]);
  });
});

describe('pinning', () => {
  it('shows each app as pinned or not from the settings', async () => {
    renderHub('/explore', {
      state: {
        settings: { language: 'vi', theme: 'system', householdSize: 2, pinnedModules: ['alpha'], recentModules: [] },
      },
    });
    const main = within(await screen.findByRole('main'));
    expect(await main.findByRole('button', { name: 'Bỏ ghim Alpha' })).toHaveAttribute('aria-pressed', 'true');
    expect(main.getByRole('button', { name: 'Ghim Beta' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('saves a new pin through the settings', async () => {
    const user = userEvent.setup();
    const { engine, state } = renderHub('/explore', {
      state: {
        settings: { language: 'vi', theme: 'system', householdSize: 2, pinnedModules: ['alpha'], recentModules: [] },
      },
    });
    await user.click(await screen.findByRole('button', { name: 'Ghim Beta' }));
    await waitFor(() => expect(engine.callsTo('hub.update_settings')).toEqual([{ pinnedModules: ['alpha', 'beta'] }]));
    expect(state.settings.pinnedModules).toEqual(['alpha', 'beta']);
    const main = within(screen.getByRole('main'));
    expect(await main.findByRole('button', { name: 'Bỏ ghim Beta' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('removes a pin from the dock list', async () => {
    const user = userEvent.setup();
    const { engine } = renderHub('/explore');
    const dock = await screen.findByRole('complementary', { name: 'Bảng ngữ cảnh' });
    expect(await within(dock).findByText('Đã ghim (2)')).toBeInTheDocument();
    await user.click(within(dock).getByRole('button', { name: 'Bỏ ghim Alpha' }));
    await waitFor(() => expect(engine.callsTo('hub.update_settings')).toEqual([{ pinnedModules: ['beta'] }]));
    expect(await within(dock).findByText('Đã ghim (1)')).toBeInTheDocument();
  });

  it('explains pinning in the dock when nothing is pinned', async () => {
    renderHub('/explore', {
      state: { settings: { language: 'vi', theme: 'system', householdSize: 2, pinnedModules: [], recentModules: [] } },
    });
    expect(await screen.findByText('Chưa ghim ứng dụng nào.')).toBeInTheDocument();
  });
});

describe('explore helpers', () => {
  it('matches case-insensitively and treats an empty query as a match', () => {
    expect(matchesQuery('', 'bất kỳ')).toBe(true);
    expect(matchesQuery('  CHI ', 'Chi tiêu', 'Thu chi')).toBe(true);
    expect(matchesQuery('xyz', 'Chi tiêu')).toBe(false);
  });

  it('toggles a pin on and off', () => {
    expect(togglePinned(['a'], 'b')).toEqual(['a', 'b']);
    expect(togglePinned(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('returns no quick actions for an empty query', () => {
    expect(filterQuickActions([], '', identity)).toEqual([]);
  });
});
