import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderHub, setViewportWidth } from '../../testing/renderHub';

beforeEach(() => setViewportWidth(1280));

const currentPath = () => screen.getByLabelText('Đường dẫn hiện tại');

describe('routes', () => {
  it('redirects the root to the Today screen', async () => {
    renderHub('/');
    expect(await screen.findByRole('heading', { name: 'Chào bạn' })).toBeInTheDocument();
    expect(currentPath()).toHaveTextContent('/today');
  });

  it('shows Explore at /explore', async () => {
    renderHub('/explore');
    expect(await screen.findByRole('searchbox', { name: 'Tìm ứng dụng' })).toBeInTheDocument();
  });

  it('opens the sync tab of settings by default', async () => {
    renderHub('/settings');
    expect(await screen.findByRole('heading', { name: 'Dữ liệu trên máy này' })).toBeInTheDocument();
  });

  it('opens the notifications tab of settings', async () => {
    renderHub('/settings/notifications');
    expect(await screen.findByRole('note')).toHaveTextContent('nhắc nhở chỉ hiện khi ứng dụng đang mở');
  });

  it('falls back to the sync tab for an unknown settings tab', async () => {
    renderHub('/settings/khong-co');
    expect(await screen.findByRole('heading', { name: 'Dữ liệu trên máy này' })).toBeInTheDocument();
  });

  it('renders a module route inside the frame', async () => {
    renderHub('/alpha/one');
    expect(await screen.findByText('Nội dung trang một')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Điều hướng' })).toBeInTheDocument();
  });

  it('sends a bare module path to its first view', async () => {
    renderHub('/beta');
    expect(await screen.findByText('Nội dung beta')).toBeInTheDocument();
    expect(currentPath()).toHaveTextContent('/beta/a');
  });

  it('draws fullscreen routes without the frame', async () => {
    renderHub('/alpha/cook/recipe-1');
    expect(await screen.findByText('Chế độ toàn màn hình')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
  });

  it('shows a friendly panel for a module path that has no route yet', async () => {
    renderHub('/beta/b');
    expect(await screen.findByText('Màn hình này đang được hoàn thiện')).toBeInTheDocument();
    const header = screen.getByRole('heading', { name: 'Mục B' });
    expect(header).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về Hôm nay' })).toHaveAttribute('href', '/today');
  });

  it('shows a not-found panel for a path outside every module', async () => {
    renderHub('/khong-co-gi');
    expect(await screen.findByText('Không tìm thấy trang này')).toBeInTheDocument();
  });

  it('keeps the sidebar highlighting the current view', async () => {
    renderHub('/alpha/two');
    const nav = await screen.findByRole('navigation', { name: 'Điều hướng' });
    expect(within(nav).getByRole('link', { name: 'Trang hai' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Trang một' })).not.toHaveAttribute('aria-current');
  });
});
