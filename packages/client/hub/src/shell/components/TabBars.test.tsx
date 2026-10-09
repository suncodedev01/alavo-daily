import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderHub, setViewportWidth } from '../../testing/renderHub';

beforeEach(() => setViewportWidth(390));

const tabBar = () => screen.findByRole('navigation', { name: 'Điều hướng' });
const labels = (bar: HTMLElement) =>
  within(bar)
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label') ?? button.textContent);

describe('tab bar inside a module', () => {
  it('shows the tab views with the module quick action in the centre', async () => {
    renderHub('/alpha/one');
    expect(labels(await tabBar())).toEqual(['Trang một', 'Việc mới của Alpha', 'Trang hai']);
  });

  it('leaves out views that are not tabs', async () => {
    renderHub('/alpha/one');
    expect(within(await tabBar()).queryByRole('button', { name: 'Trang ba' })).not.toBeInTheDocument();
  });

  it('has no centre action for a module without quick actions', async () => {
    renderHub('/beta/a');
    expect(labels(await tabBar())).toEqual(['Mục A', 'Mục B', 'Mục C']);
  });

  it('marks the current view and navigates on tap', async () => {
    const user = userEvent.setup();
    renderHub('/alpha/one');
    const bar = await tabBar();
    expect(within(bar).getByRole('button', { name: 'Trang một' })).toHaveAttribute('aria-current', 'page');
    await user.click(within(bar).getByRole('button', { name: 'Trang hai' }));
    expect(await screen.findByText('Nội dung trang hai')).toBeInTheDocument();
    expect(within(await tabBar()).getByRole('button', { name: 'Trang hai' })).toHaveAttribute('aria-current', 'page');
  });

  it('opens the quick action path from the centre button', async () => {
    const user = userEvent.setup();
    renderHub('/alpha/two');
    await user.click(within(await tabBar()).getByRole('button', { name: 'Việc mới của Alpha' }));
    expect(screen.getByLabelText('Đường dẫn hiện tại')).toHaveTextContent('/alpha/one?new=1');
  });
});

describe('tab bar on the home module', () => {
  it('orders Today, first pin, Explore, second pin, Settings', async () => {
    renderHub('/today');
    await screen.findByRole('heading', { name: 'Chào bạn' });
    expect(labels(await tabBar())).toEqual(['Hôm nay', 'Alpha', 'Khám phá', 'Beta', 'Cài đặt']);
  });

  it('uses only the first two pinned modules', async () => {
    renderHub('/today', {
      state: {
        settings: {
          language: 'vi',
          theme: 'system',
          householdSize: 2,
          pinnedModules: ['beta', 'alpha', 'gamma'],
          recentModules: [],
        },
      },
    });
    await screen.findByRole('heading', { name: 'Chào bạn' });
    expect(labels(await tabBar())).toEqual(['Hôm nay', 'Beta', 'Khám phá', 'Alpha', 'Cài đặt']);
  });

  it('gives Explore the raised centre action with a label', async () => {
    renderHub('/explore');
    const explore = within(await tabBar()).getByRole('button', { name: 'Khám phá' });
    expect(explore).toHaveTextContent('Khám phá');
    expect(explore).toHaveAttribute('aria-current', 'page');
  });

  it('opens a pinned module from its tab', async () => {
    const user = userEvent.setup();
    renderHub('/today');
    await screen.findByRole('heading', { name: 'Chào bạn' });
    await user.click(within(await tabBar()).getByRole('button', { name: 'Beta' }));
    expect(await screen.findByText('Nội dung beta')).toBeInTheDocument();
  });

  it('opens settings from the last tab', async () => {
    const user = userEvent.setup();
    renderHub('/today');
    await user.click(within(await tabBar()).getByRole('button', { name: 'Cài đặt' }));
    expect(await screen.findByRole('heading', { name: 'Dữ liệu trên máy này' })).toBeInTheDocument();
    expect(within(await tabBar()).getByRole('button', { name: 'Cài đặt' })).toHaveAttribute('aria-current', 'page');
  });
});
