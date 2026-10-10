import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ModuleManifest, MoreDialogProps } from '@alavo-daily/common';
import { Dialog } from '@alavo-daily/design-system';

import { renderHub, setViewportWidth, TEST_MODULES } from '../../../testing/renderHub';

const ran = vi.fn();

function TestDialog({ open, onOpenChange }: MoreDialogProps) {
  return <Dialog open={open} onOpenChange={onOpenChange} title="Hộp thoại thử" />;
}

const gamma: ModuleManifest = {
  id: 'gamma',
  name: 'Gamma',
  icon: 'wallet',
  description: 'Ứng dụng thử số ba',
  views: [
    { id: 'g1', label: 'Gam một', icon: 'squares-four', path: '/gamma/g1', tab: true },
    { id: 'g2', label: 'Gam hai', icon: 'receipt', path: '/gamma/g2', tab: true },
    { id: 'g3', label: 'Gam ba', icon: 'target', path: '/gamma/g3', more: true },
  ],
  quickActions: [
    { id: 'new-g', label: 'Việc mới của Gamma', tabLabel: 'Ghi chép', icon: 'plus', path: '/gamma/g1?new=1' },
  ],
  more: {
    sections: [
      {
        id: 'plans',
        title: 'Kế hoạch',
        items: [
          { id: 'three', label: 'Mục ba', icon: 'target', description: 'Đi tới trang ba', target: { screen: '/gamma/g3' } },
          { id: 'dialog', label: 'Mục hộp thoại', icon: 'repeat', useDescription: () => '3 khoản đang chạy', target: { dialog: TestDialog } },
        ],
      },
      {
        id: 'data',
        title: 'Dữ liệu',
        items: [
          { id: 'export', label: 'Mục hành động', icon: 'download-simple', target: { useAction: () => ran } },
        ],
      },
    ],
  },
  routes: [
    { path: '/gamma/g1', element: <p>Nội dung gam một</p> },
    { path: '/gamma/g2', element: <p>Nội dung gam hai</p> },
    { path: '/gamma/g3', element: <p>Nội dung gam ba</p> },
  ],
};

const modules = [...TEST_MODULES, gamma];
const tabBar = () => screen.findByRole('navigation', { name: 'Điều hướng' });
const labels = (bar: HTMLElement) =>
  within(bar)
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label') ?? button.textContent);

beforeEach(() => {
  ran.mockClear();
  setViewportWidth(390);
});

describe('tab bar of a module with a "Khác" screen', () => {
  it('puts the short action label in the middle and "Khác" last, without the views that live under it', async () => {
    renderHub('/gamma/g1', { modules });
    expect(labels(await tabBar())).toEqual(['Gam một', 'Ghi chép', 'Gam hai', 'Khác']);
  });

  it('opens the "Khác" screen from the tab and lights it up', async () => {
    const user = userEvent.setup();
    renderHub('/gamma/g1', { modules });
    await user.click(within(await tabBar()).getByRole('button', { name: 'Khác' }));
    expect(await screen.findByRole('region', { name: 'Kế hoạch' })).toBeInTheDocument();
    expect(within(await tabBar()).getByRole('button', { name: 'Khác' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps "Khác" lit on a screen that lives under it', async () => {
    renderHub('/gamma/g3', { modules });
    expect(within(await tabBar()).getByRole('button', { name: 'Khác' })).toHaveAttribute('aria-current', 'page');
    expect(within(await tabBar()).getByRole('button', { name: 'Gam một' })).not.toHaveAttribute('aria-current');
  });

  it('adds nothing to a module that declares no "Khác" screen', async () => {
    renderHub('/beta/a', { modules });
    expect(labels(await tabBar())).toEqual(['Mục A', 'Mục B', 'Mục C']);
  });
});

describe('"Khác" screen', () => {
  it('draws one card per section with the rows the module declared and the descriptions it computed', async () => {
    renderHub('/gamma/more', { modules });
    const plans = await screen.findByRole('region', { name: 'Kế hoạch' });
    expect(within(plans).getByText('Đi tới trang ba')).toBeInTheDocument();
    expect(within(plans).getByText('3 khoản đang chạy')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Dữ liệu' })).getByRole('button', { name: /Mục hành động/ })).toBeInTheDocument();
  });

  it('goes to a screen, opens a dialog and runs an action, each from its own row', async () => {
    const user = userEvent.setup();
    renderHub('/gamma/more', { modules });
    await user.click(await screen.findByRole('button', { name: /Mục hộp thoại/ }));
    expect(await screen.findByRole('dialog', { name: 'Hộp thoại thử' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: /Mục hành động/ }));
    expect(ran).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: /Mục ba/ }));
    expect(await screen.findByText('Nội dung gam ba')).toBeInTheDocument();
  });
});

describe('sidebar of a module with a "Khác" screen', () => {
  it('lists the primary views and "Khác", not the views that live under it', async () => {
    setViewportWidth(1280);
    renderHub('/gamma/g1', { modules });
    const sidebar = await screen.findByRole('navigation', { name: 'Điều hướng' });
    expect(within(sidebar).getByRole('link', { name: 'Khác' })).toHaveAttribute('href', '/gamma/more');
    expect(within(sidebar).queryByRole('link', { name: 'Gam ba' })).not.toBeInTheDocument();
  });
});
