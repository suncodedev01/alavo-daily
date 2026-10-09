import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderHub, setViewportWidth } from '../../testing/renderHub';

beforeEach(() => setViewportWidth(1280));

describe('wide frame', () => {
  it('shows the screen title in the pane header', async () => {
    renderHub('/alpha/one');
    const main = await screen.findByRole('main');
    expect(within(main).getByRole('heading', { name: 'Trang một' })).toBeInTheDocument();
  });

  it('portals the screen actions into the pane header', async () => {
    renderHub('/alpha/one');
    const action = await screen.findByRole('button', { name: 'Việc của trang một' });
    expect(action.closest('header')).toHaveTextContent('Trang một');
  });

  it('portals the list into the list pane with the screen label', async () => {
    renderHub('/alpha/one');
    const list = await screen.findByRole('region', { name: 'Danh sách Alpha' });
    expect(within(list).getByText('Danh sách của Alpha')).toBeInTheDocument();
    expect(list.closest('aside')).not.toBeNull();
  });

  it('portals the dock into the context panel', async () => {
    renderHub('/alpha/one');
    const dock = await screen.findByRole('complementary', { name: 'Bảng ngữ cảnh' });
    expect(within(dock).getByText('Ngữ cảnh của Alpha')).toBeInTheDocument();
  });

  it('removes the list and dock when the next screen has none', async () => {
    const user = userEvent.setup();
    renderHub('/alpha/one');
    await screen.findByText('Danh sách của Alpha');
    await user.click(screen.getByRole('link', { name: 'Trang ba' }));
    expect(await screen.findByText('Màn hình này đang được hoàn thiện')).toBeInTheDocument();
    expect(screen.queryByText('Danh sách của Alpha')).not.toBeInTheDocument();
    expect(screen.queryByText('Ngữ cảnh của Alpha')).not.toBeInTheDocument();
  });

  it('toggles the dock from the header button', async () => {
    const user = userEvent.setup();
    renderHub('/alpha/one');
    const dock = await screen.findByText('Ngữ cảnh của Alpha');
    const panel = dock.closest('aside') as HTMLElement;
    expect(panel).toHaveAttribute('data-open');
    await user.click(screen.getByRole('button', { name: 'Bật/tắt bảng bên phải' }));
    expect(panel).not.toHaveAttribute('data-open');
  });

  it('hides the dock toggle on screens without a dock', async () => {
    renderHub('/beta/b');
    await screen.findByText('Màn hình này đang được hoàn thiện');
    expect(screen.queryByRole('button', { name: 'Bật/tắt bảng bên phải' })).not.toBeInTheDocument();
  });

  it('replaces the list pane content when the next screen has its own list', async () => {
    const user = userEvent.setup();
    renderHub('/alpha/one');
    await screen.findByRole('region', { name: 'Danh sách Alpha' });
    await user.click(screen.getByRole('link', { name: 'Trang hai' }));
    expect(await screen.findByRole('region', { name: 'Danh sách' })).toHaveTextContent('Danh sách hai');
  });
});

describe('narrow frame', () => {
  beforeEach(() => setViewportWidth(390));

  it('shows the title as a heading above the content with actions beside it', async () => {
    renderHub('/alpha/one');
    expect(await screen.findByRole('heading', { name: 'Trang một' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Việc của trang một' })).toBeInTheDocument();
    expect(screen.getByText('Nội dung trang một')).toBeVisible();
  });

  it('does not show the dock', async () => {
    renderHub('/alpha/one');
    await screen.findByText('Nội dung trang một');
    expect(screen.queryByText('Ngữ cảnh của Alpha')).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('hides the list when the screen shows its main pane first', async () => {
    renderHub('/alpha/one');
    await screen.findByText('Nội dung trang một');
    expect(screen.getByText('Danh sách của Alpha')).not.toBeVisible();
  });

  it('shows the list and hides the main pane when the screen asks for the list first', async () => {
    renderHub('/alpha/two');
    expect(await screen.findByText('Danh sách hai')).toBeVisible();
    expect(screen.getByText('Nội dung trang hai')).not.toBeVisible();
  });

  it('switches frames when the window is resized', async () => {
    renderHub('/alpha/one');
    await screen.findByText('Nội dung trang một');
    expect(screen.queryByRole('button', { name: 'Bật/tắt bảng bên phải' })).not.toBeInTheDocument();
    setViewportWidth(1280);
    expect(await screen.findByRole('button', { name: 'Bật/tắt bảng bên phải' })).toBeInTheDocument();
  });
});
