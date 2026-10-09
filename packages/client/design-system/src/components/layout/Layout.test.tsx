import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from '../controls/IconButton';
import { AppFrame } from './AppFrame';
import { MobileFrame } from './MobileFrame';
import { ModulePill } from './ModulePill';
import { NavItem } from './NavItem';
import { PageColumn, PaneBody } from './PaneBody';
import { PaneHeader } from './PaneHeader';
import { Sidebar, SidebarFooter, SidebarGroup, SidebarHeader } from './Sidebar';
import { TabBar, TabBarAction, TabBarItem } from './TabBar';
import { TopBar } from './TopBar';

function AppHarness({ dockOpen = true, withList = false }: { dockOpen?: boolean; withList?: boolean }) {
  return (
    <AppFrame
      sidebar={
        <Sidebar header={<SidebarHeader>Chi tiêu</SidebarHeader>} footer={<SidebarFooter>Linh Nguyễn</SidebarFooter>}>
          <SidebarGroup>
            <NavItem icon="squares-four" label="Tổng quan" active />
            <NavItem icon="receipt" label="Giao dịch" count={23} />
          </SidebarGroup>
          <SidebarGroup label="Ví">
            <NavItem icon="wallet" label="Techcombank" />
          </SidebarGroup>
        </Sidebar>
      }
      list={withList ? <p>Danh sách giao dịch</p> : undefined}
      dock={<p>Cần bạn quyết định</p>}
      dockOpen={dockOpen}
    >
      <PaneHeader title="Tổng quan" actions={<IconButton icon="bell" label="Thông báo" />} />
      <PaneBody>Nội dung chính</PaneBody>
    </AppFrame>
  );
}

describe('AppFrame', () => {
  it('lays out sidebar navigation, a main working pane and a dock', () => {
    render(<AppHarness />);
    expect(screen.getByRole('navigation', { name: 'Điều hướng' })).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByRole('heading', { name: 'Tổng quan' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Bảng ngữ cảnh' })).toBeInTheDocument();
  });

  it('lets a long sidebar list scroll instead of running over the footer', () => {
    render(<AppHarness />);
    const nav = screen.getByRole('navigation', { name: 'Điều hướng' });
    expect(nav.className).toContain('min-h-0');
    expect(nav.className).toContain('overflow-y-auto');
  });

  it('keeps the working pane flat on the paper background', () => {
    render(<AppHarness />);
    const main = screen.getByRole('main');
    expect(main.className).not.toContain('shadow');
    expect(main.parentElement?.className).toContain('bg-paper');
  });

  it('makes the sidebar a floating card with the card shadow token', () => {
    render(<AppHarness />);
    const sidebar = screen.getAllByRole('complementary')[0] as HTMLElement;
    expect(sidebar.className).toContain('shadow-card');
    expect(sidebar.className).toContain('rounded-lg');
    expect(sidebar.className).toContain('m-2');
  });

  it('renders the optional list pane only when provided', () => {
    const { rerender } = render(<AppHarness />);
    expect(screen.queryByText('Danh sách giao dịch')).not.toBeInTheDocument();
    rerender(<AppHarness withList />);
    expect(screen.getByRole('complementary', { name: 'Danh sách' })).toHaveTextContent('Danh sách giao dịch');
  });

  it('exposes the dock content when open', () => {
    render(<AppHarness dockOpen />);
    const dock = screen.getByRole('complementary', { name: 'Bảng ngữ cảnh' });
    expect(dock).toHaveAttribute('data-open');
    expect(dock).not.toHaveAttribute('aria-hidden', 'true');
    expect(dock.className).toContain('w-90');
  });

  it('collapses the dock and hides it from assistive technology when closed', () => {
    render(<AppHarness dockOpen={false} />);
    const dock = screen.getByText('Cần bạn quyết định').closest('aside') as HTMLElement;
    expect(dock).not.toHaveAttribute('data-open');
    expect(dock).toHaveAttribute('aria-hidden', 'true');
    expect(dock).toHaveAttribute('inert');
    expect(dock.className).toContain('w-0');
    expect(dock.className).toContain('opacity-0');
  });

  it('animates the dock with the 0.2s ease-in-out transition and respects reduced motion', () => {
    render(<AppHarness />);
    const dock = screen.getByRole('complementary', { name: 'Bảng ngữ cảnh' });
    expect(dock.className).toContain('duration-200');
    expect(dock.className).toContain('ease-in-out');
    expect(dock.className).toContain('motion-reduce:transition-none');
  });

  it('turns the dock into an overlay panel below 1180px', () => {
    render(<AppHarness />);
    expect(screen.getByRole('complementary', { name: 'Bảng ngữ cảnh' }).className).toContain('max-dock:fixed');
  });

  it('renders no dock when none is given', () => {
    render(
      <AppFrame sidebar={<Sidebar>x</Sidebar>}>
        <p>Chính</p>
      </AppFrame>,
    );
    expect(screen.queryByRole('complementary', { name: 'Bảng ngữ cảnh' })).not.toBeInTheDocument();
  });
});

describe('NavItem', () => {
  it('marks the active item with aria-current and the accent pill tokens', () => {
    render(<NavItem icon="squares-four" label="Tổng quan" active />);
    const item = screen.getByRole('button', { name: 'Tổng quan' });
    expect(item).toHaveAttribute('aria-current', 'page');
    expect(item.className).toContain('bg-accent');
    expect(item.className).toContain('text-accent-fg');
  });

  it('is not current by default and shows hover tint', () => {
    render(<NavItem icon="receipt" label="Giao dịch" />);
    const item = screen.getByRole('button', { name: 'Giao dịch' });
    expect(item).not.toHaveAttribute('aria-current');
    expect(item.className).toContain('hover:bg-surface-tint');
  });

  it('shows the count and keeps the label in the accessible name', () => {
    render(<NavItem icon="receipt" label="Giao dịch" count={23} />);
    expect(screen.getByRole('button', { name: /Giao dịch/ })).toHaveTextContent('23');
  });

  it('fires onClick from mouse and keyboard', async () => {
    const onClick = vi.fn();
    render(<NavItem icon="target" label="Mục tiêu" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Mục tiêu' }));
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('can render as a link through the render prop', () => {
    render(<NavItem icon="gear" label="Cài đặt" render={<a href="/settings" />} />);
    expect(screen.getByRole('link', { name: 'Cài đặt' })).toHaveAttribute('href', '/settings');
  });
});

describe('Sidebar and panes', () => {
  it('groups items under an eyebrow label', () => {
    render(
      <Sidebar>
        <SidebarGroup label="Ví">
          <NavItem icon="wallet" label="Techcombank" />
        </SidebarGroup>
      </Sidebar>,
    );
    expect(screen.getByText('Ví').className).toContain('eyebrow');
  });

  it('PaneHeader shows the title and actions at the 48px datum', () => {
    const { container } = render(<PaneHeader title="Giao dịch" actions={<button>Thêm</button>} />);
    expect(screen.getByRole('heading', { name: 'Giao dịch' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm' })).toBeInTheDocument();
    expect(container.firstElementChild?.className).toContain('h-12');
  });

  it('PaneBody scrolls and optionally wraps content in a max-width column', () => {
    const { rerender } = render(<PaneBody data-testid="body">Nội dung</PaneBody>);
    expect(screen.getByTestId('body').className).toContain('overflow-y-auto');
    expect(screen.getByTestId('body').querySelector('.mx-auto')).toBeNull();
    rerender(
      <PaneBody data-testid="body" maxWidth="page">
        Nội dung
      </PaneBody>,
    );
    expect(screen.getByTestId('body').querySelector('.max-w-300')).not.toBeNull();
  });

  it('PageColumn supports the narrower detail width', () => {
    render(<PageColumn maxWidth="detail" data-testid="col" />);
    expect(screen.getByTestId('col').className).toContain('max-w-160');
  });
});

describe('MobileFrame', () => {
  it('renders top bar, scrolling content and tab bar in order', () => {
    render(
      <MobileFrame topBar={<TopBar>top</TopBar>} tabBar={<TabBar><TabBarItem icon="house" label="Hôm nay" /></TabBar>}>
        <p>Nội dung</p>
      </MobileFrame>,
    );
    const frame = screen.getByRole('main').parentElement as HTMLElement;
    expect(Array.from(frame.children).map((child) => child.tagName.toLowerCase())).toEqual(['header', 'main', 'nav']);
    expect(screen.getByRole('main')).toHaveTextContent('Nội dung');
  });

  it('uses dynamic viewport height, safe-area padding and 16px scroll padding', () => {
    render(<MobileFrame><p>x</p></MobileFrame>);
    const frame = screen.getByRole('main').parentElement as HTMLElement;
    expect(frame.className).toContain('h-dvh');
    expect(frame.className).toContain('pt-safe');
    expect(screen.getByRole('main').className).toContain('px-4');
    expect(screen.getByRole('main').className).toContain('overflow-y-auto');
  });

  it('omits optional bars when not provided', () => {
    render(<MobileFrame><p>x</p></MobileFrame>);
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});

describe('MobileFrame with the on-screen keyboard', () => {
  function setViewportHeight(height: number) {
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
  }

  function renderWithInput() {
    render(
      <MobileFrame tabBar={<TabBar><TabBarItem icon="house" label="Hôm nay" /></TabBar>}>
        <input aria-label="Ghi chú" />
        <button type="button">Lưu</button>
      </MobileFrame>,
    );
  }

  it('hides the tab bar while a text field is focused and the viewport shrinks', async () => {
    setViewportHeight(800);
    renderWithInput();
    await userEvent.click(screen.getByLabelText('Ghi chú'));
    setViewportHeight(420);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    setViewportHeight(800);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('keeps the tab bar when the viewport shrinks without a text field focused', () => {
    setViewportHeight(800);
    renderWithInput();
    setViewportHeight(420);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    setViewportHeight(800);
  });
});

describe('TabBar', () => {
  it('is a labelled navigation landmark with items showing icon and label', () => {
    render(
      <TabBar label="Điều hướng chính">
        <TabBarItem icon="squares-four" label="Tổng quan" />
        <TabBarItem icon="receipt" label="Giao dịch" />
      </TabBar>,
    );
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' });
    expect(within(nav).getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Tổng quan' })).toBeInTheDocument();
  });

  it('marks the active item with aria-current and the accent pill', () => {
    render(
      <TabBar>
        <TabBarItem icon="squares-four" label="Tổng quan" active />
        <TabBarItem icon="receipt" label="Giao dịch" />
      </TabBar>,
    );
    const active = screen.getByRole('button', { name: 'Tổng quan' });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active.querySelector('span')?.className).toContain('bg-accent');
    expect(screen.getByRole('button', { name: 'Giao dịch' })).not.toHaveAttribute('aria-current');
  });

  it('keeps tab items at least 48px tall for touch', () => {
    render(<TabBar><TabBarItem icon="house" label="Hôm nay" /></TabBar>);
    expect(screen.getByRole('button', { name: 'Hôm nay' }).className).toContain('min-h-12');
  });

  it('fires onClick for items', async () => {
    const onClick = vi.fn();
    render(<TabBar><TabBarItem icon="house" label="Hôm nay" onClick={onClick} /></TabBar>);
    await userEvent.click(screen.getByRole('button', { name: 'Hôm nay' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders the add action as a labelled raised button without visible text', () => {
    render(
      <TabBar>
        <TabBarItem icon="house" label="Hôm nay" />
        <TabBarAction icon="plus" label="Thêm giao dịch" />
      </TabBar>,
    );
    const add = screen.getByRole('button', { name: 'Thêm giao dịch' });
    expect(add).not.toHaveTextContent('Thêm giao dịch');
    expect(add.querySelector('span')?.className).toContain('bg-primary');
  });

  it('renders the explore action with a label under the raised button', () => {
    render(
      <TabBar>
        <TabBarAction icon="compass" label="Khám phá" showLabel active />
      </TabBar>,
    );
    const explore = screen.getByRole('button', { name: 'Khám phá' });
    expect(explore).toHaveTextContent('Khám phá');
    expect(explore).toHaveAttribute('aria-current', 'page');
    expect(explore.className).toContain('-mt-3.5');
  });

  it('draws the filled compass when explore is active', () => {
    const { container, rerender } = render(<TabBar><TabBarAction icon="compass" label="Khám phá" showLabel active /></TabBar>);
    const activeMarkup = container.querySelector('svg')?.innerHTML;
    rerender(<TabBar><TabBarAction icon="compass" label="Khám phá" showLabel /></TabBar>);
    expect(container.querySelector('svg')?.innerHTML).not.toBe(activeMarkup);
  });
});

describe('TopBar and ModulePill', () => {
  it('shows the module pill leading and actions trailing', () => {
    render(
      <TopBar leading={<ModulePill icon="wallet" name="Chi tiêu" aria-label="Chuyển ứng dụng" />}>
        <IconButton icon="bell" label="Thông báo" badge />
      </TopBar>,
    );
    expect(screen.getByRole('button', { name: 'Chuyển ứng dụng' })).toHaveTextContent('Chi tiêu');
    expect(screen.getByRole('button', { name: 'Thông báo' })).toHaveAttribute('data-badge');
  });

  it('ModulePill reports popup semantics and fires onClick', async () => {
    const onClick = vi.fn();
    render(<ModulePill icon="wallet" name="Chi tiêu" onClick={onClick} />);
    const pill = screen.getByRole('button', { name: /Chi tiêu/ });
    expect(pill).toHaveAttribute('aria-haspopup', 'dialog');
    await userEvent.click(pill);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
