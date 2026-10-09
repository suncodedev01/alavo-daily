import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLayout, WIDE_BREAKPOINT_PX } from '@/hooks/useLayout';
import { cn } from '@/lib/utils';
import { Icon, resolveIcon } from './Icon';
import { FALLBACK_ICON, ICON_REGISTRY, MOCKUP_ICON_NAMES, iconNames } from './iconRegistry';
import { resetToasts, TOAST_DURATION_MS, Toaster, useToast } from './Toaster';

function setWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
}

describe('Icon registry', () => {
  it('contains every icon used in the mockups', () => {
    for (const name of MOCKUP_ICON_NAMES) expect(ICON_REGISTRY[name]).toBeDefined();
  });

  it('offers a generous set of icons for categories', () => {
    expect(iconNames.length).toBeGreaterThanOrEqual(120);
    expect(iconNames).toContain('fork-knife');
  });

  it('falls back to the tag icon for unknown names', () => {
    const resolved = resolveIcon('khong-co-icon-nay');
    expect(resolved.known).toBe(false);
    expect(resolved.component).toBe(FALLBACK_ICON);
    expect(ICON_REGISTRY['tag']).toBe(FALLBACK_ICON);
  });

  it('resolves a -fill suffix to the base icon in fill weight', () => {
    const resolved = resolveIcon('compass-fill');
    expect(resolved.component).toBe(ICON_REGISTRY['compass']);
    expect(resolved.weight).toBe('fill');
  });
});

describe('Icon', () => {
  it('renders a decorative svg by default', () => {
    const { container } = render(<Icon name="fork-knife" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('data-icon-name', 'fork-knife');
  });

  it('becomes an image with an accessible name when labelled', () => {
    render(<Icon name="bell" label="Thông báo" />);
    expect(screen.getByRole('img', { name: 'Thông báo' })).toBeInTheDocument();
  });

  it('accepts named and numeric sizes', () => {
    const { container, rerender } = render(<Icon name="plus" size="xl" />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '24');
    rerender(<Icon name="plus" size={18} />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '18');
  });

  it('marks unknown names with the fallback attribute', () => {
    const { container } = render(<Icon name="khong-co" />);
    expect(container.querySelector('svg')).toHaveAttribute('data-icon-fallback', 'khong-co');
  });

  it('passes data-icon through for button icon slots', () => {
    const { container } = render(<Icon name="plus" data-icon="inline-start" />);
    expect(container.querySelector('svg')).toHaveAttribute('data-icon', 'inline-start');
  });
});

describe('useLayout', () => {
  afterEach(() => setWidth(1024));

  it.each([
    [1280, 'wide'],
    [WIDE_BREAKPOINT_PX, 'wide'],
    [WIDE_BREAKPOINT_PX - 1, 'narrow'],
    [390, 'narrow'],
  ] as const)('reports %ipx as %s', (width, expected) => {
    setWidth(width);
    const { result } = renderHook(() => useLayout());
    expect(result.current).toBe(expected);
  });

  it('subscribes to window resize', () => {
    setWidth(1280);
    const { result } = renderHook(() => useLayout());
    expect(result.current).toBe('wide');
    act(() => {
      setWidth(600);
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe('narrow');
    act(() => {
      setWidth(1400);
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe('wide');
  });

  it('removes its resize listener on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useLayout());
    unmount();
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    remove.mockRestore();
  });
});

describe('Toaster', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    act(() => resetToasts());
    vi.useRealTimers();
  });

  function ToastButton({ message }: { message: string }) {
    const { toast } = useToast();
    return <button onClick={() => toast(message)}>Hiện</button>;
  }

  it('shows the message for 2.2 seconds then hides it', () => {
    render(
      <>
        <Toaster />
        <ToastButton message="Đã lưu giao dịch" />
      </>,
    );
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    act(() => screen.getByRole('button', { name: 'Hiện' }).click());
    expect(screen.getByRole('status')).toHaveTextContent('Đã lưu giao dịch');
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1));
    expect(screen.getByRole('status')).toHaveTextContent('Đã lưu giao dịch');
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('restarts the timer when a second toast arrives', () => {
    render(
      <>
        <Toaster />
        <ToastButton message="Một" />
      </>,
    );
    const button = screen.getByRole('button', { name: 'Hiện' });
    act(() => button.click());
    act(() => vi.advanceTimersByTime(2000));
    act(() => button.click());
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('status')).toHaveTextContent('Một');
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('announces politely to assistive technology', () => {
    render(<Toaster />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});

describe('cn', () => {
  it('keeps both a custom font size and a text colour token', () => {
    expect(cn('text-accent-fg', 'text-row')).toContain('text-accent-fg');
    expect(cn('text-accent-fg', 'text-row')).toContain('text-row');
  });

  it('lets the later named shadow win', () => {
    expect(cn('shadow-card', 'shadow-overlay')).toBe('shadow-overlay');
  });

  it('joins conditional class values', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });
});
