import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { IconButton } from './IconButton';

describe('Button', () => {
  it('renders its label and fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Lưu giao dịch</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Lưu giao dịch' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('activates with Enter and Space from the keyboard', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Lưu</Button>);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('does not fire when disabled', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Đã tắt</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Đã tắt' }));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Đã tắt' })).toBeDisabled();
  });

  it.each(['primary', 'outline', 'ghost', 'affirm', 'destructive', 'destructive-outline'] as const)(
    'renders the %s variant',
    (variant) => {
      render(<Button variant={variant}>Nút</Button>);
      expect(screen.getByRole('button', { name: 'Nút' })).toBeInTheDocument();
    },
  );

  it('marks leading and trailing icons with data-icon', () => {
    render(
      <Button leadingIcon="plus" trailingIcon="caret-down">
        Thêm
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Thêm' });
    expect(button.querySelector('[data-icon="inline-start"]')).not.toBeNull();
    expect(button.querySelector('[data-icon="inline-end"]')).not.toBeNull();
  });

  it('uses the click-600 primary token with a white label token', () => {
    render(<Button>Chính</Button>);
    const button = screen.getByRole('button', { name: 'Chính' });
    expect(button.className).toContain('bg-primary');
    expect(button.className).toContain('text-primary-fg');
    expect(button.className).toContain('hover:bg-primary-hover');
  });
});

describe('IconButton', () => {
  it('exposes the required label as the accessible name', () => {
    render(<IconButton icon="bell" label="Thông báo" />);
    expect(screen.getByRole('button', { name: 'Thông báo' })).toBeInTheDocument();
  });

  it('shows a notification dot only when badge is set', () => {
    const { rerender } = render(<IconButton icon="bell" label="Thông báo" />);
    expect(screen.getByRole('button', { name: 'Thông báo' })).not.toHaveAttribute('data-badge');
    rerender(<IconButton icon="bell" label="Thông báo" badge />);
    expect(screen.getByRole('button', { name: 'Thông báo' })).toHaveAttribute('data-badge');
  });

  it('keeps a 44px touch target on narrow layouts', () => {
    render(<IconButton icon="x" label="Đóng" />);
    expect(screen.getByRole('button', { name: 'Đóng' }).className).toContain('max-lg:size-11');
  });

  it('calls onClick and respects disabled', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<IconButton icon="x" label="Đóng" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<IconButton icon="x" label="Đóng" onClick={onClick} disabled />);
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
