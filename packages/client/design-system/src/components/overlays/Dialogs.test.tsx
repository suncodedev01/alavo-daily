import { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../controls/Button';
import { Field } from '../controls/Field';
import { ConfirmDialog } from './ConfirmDialog';
import { Dialog } from './Dialog';
import { ResponsiveDialog } from './ResponsiveDialog';
import { Sheet } from './Sheet';

function setWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
}

afterEach(() => setWidth(1024));

function DialogHarness({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button onClick={() => setOpen(true)}>Mở</Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange?.(next);
        }}
        title="Thêm giao dịch"
        description="Nhập số tiền và ghi chú."
        footer={<Button onClick={() => setOpen(false)}>Lưu</Button>}
      >
        <Field aria-label="Ghi chú" />
      </Dialog>
    </div>
  );
}

describe('Dialog layout on short screens', () => {
  it('scrolls the body while the footer stays outside the scrolling area', async () => {
    render(<DialogHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Mở' }));
    const body = screen.getByRole('textbox', { name: 'Ghi chú' }).closest('.overflow-y-auto') as HTMLElement;
    expect(body).not.toBeNull();
    expect(body).not.toContainElement(screen.getByRole('button', { name: 'Lưu' }));
  });

  it('keeps docked top and bottom content outside the scrolling body', () => {
    render(
      <Sheet
        open
        title="Thêm giao dịch"
        docks={{ top: <output aria-label="Số tiền">0</output>, bottom: <button type="button">Bàn phím</button> }}
        footer={<Button>Lưu</Button>}
      >
        <Field aria-label="Ghi chú" />
      </Sheet>,
    );
    const body = screen.getByRole('textbox', { name: 'Ghi chú' }).closest('.overflow-y-auto') as HTMLElement;
    expect(body).toContainElement(screen.getByRole('textbox', { name: 'Ghi chú' }));
    expect(body).not.toContainElement(screen.getByRole('status', { name: 'Số tiền' }));
    expect(body).not.toContainElement(screen.getByRole('button', { name: 'Bàn phím' }));
  });

  it('limits a sheet to the dynamic viewport height', async () => {
    render(
      <Sheet open title="Chuyển ứng dụng">
        <p>Nội dung</p>
      </Sheet>,
    );
    expect(screen.getByRole('dialog').className).toContain('max-h-[min(92dvh,');
  });

  it('keeps a sheet above the keyboard and inside the part of the screen that is still visible', async () => {
    render(
      <Sheet open title="Thêm ví">
        <p>Nội dung</p>
      </Sheet>,
    );
    const { className } = screen.getByRole('dialog');
    expect(className).toContain('bottom-(--keyboard-inset,0px)');
    expect(className).toContain('var(--visible-height,100dvh)');
  });
});

describe('Dialog closing animation', () => {
  it('keeps the scrim and the panel faded out until both are removed', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole('button', { name: 'Mở' }));
    const panel = await screen.findByRole('dialog');
    const scrim = document.querySelector('[data-slot="dialog-overlay"]');
    expect(panel.className).toContain('data-closed:fill-mode-forwards');
    expect(scrim?.className).toContain('data-closed:fill-mode-forwards');
    expect(scrim?.className).toContain('duration-200');
  });
});

describe('Dialog', () => {
  it('is closed until opened and then exposes title and description', async () => {
    render(<DialogHarness />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mở' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm giao dịch' });
    expect(dialog).toHaveAccessibleDescription('Nhập số tiền và ghi chú.');
  });

  it('renders children and the footer slot', async () => {
    render(<DialogHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Mở' }));
    await screen.findByRole('dialog');
    expect(screen.getByRole('textbox', { name: 'Ghi chú' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeInTheDocument();
  });

  it('closes with the close button and restores focus to the opener', async () => {
    const onOpenChange = vi.fn();
    render(<DialogHarness onOpenChange={onOpenChange} />);
    const opener = screen.getByRole('button', { name: 'Mở' });
    await userEvent.click(opener);
    await screen.findByRole('dialog');
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(opener).toHaveFocus();
  });

  it('closes with Escape', async () => {
    render(<DialogHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Mở' }));
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('moves focus into the dialog and never lets Tab reach the page behind it', async () => {
    render(<DialogHarness />);
    const opener = screen.getByRole('button', { name: 'Mở' });
    await userEvent.click(opener);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    for (let step = 0; step < 8; step += 1) {
      await userEvent.tab();
      expect(document.activeElement).not.toBe(opener);
    }
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });

  it('supports a custom close label', async () => {
    render(<Dialog open onOpenChange={() => undefined} title="Tiêu đề" closeLabel="Close" />);
    expect(await screen.findByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});

describe('Sheet', () => {
  it('shows a grabber, title and body when open', async () => {
    render(
      <Sheet open onOpenChange={() => undefined} title="Hạng mục mới">
        <p>Nội dung</p>
      </Sheet>,
    );
    const sheet = await screen.findByRole('dialog', { name: 'Hạng mục mới' });
    expect(sheet.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByText('Nội dung')).toBeInTheDocument();
  });

  it('closes with Escape and reports it', async () => {
    const onOpenChange = vi.fn();
    render(<Sheet open onOpenChange={onOpenChange} title="Hạng mục mới" />);
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('is not rendered while closed', () => {
    render(<Sheet open={false} onOpenChange={() => undefined} title="Hạng mục mới" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ResponsiveDialog', () => {
  it('uses the centred dialog layout on wide screens', async () => {
    setWidth(1280);
    render(<ResponsiveDialog open onOpenChange={() => undefined} title="Thêm công thức" />);
    const dialog = await screen.findByRole('dialog', { name: 'Thêm công thức' });
    expect(dialog.className).toContain('rounded-2xl');
    expect(dialog.className).not.toContain('rounded-t-4xl');
  });

  it('uses the bottom sheet on narrow screens', async () => {
    setWidth(390);
    render(<ResponsiveDialog open onOpenChange={() => undefined} title="Thêm công thức" />);
    const dialog = await screen.findByRole('dialog', { name: 'Thêm công thức' });
    expect(dialog.className).toContain('rounded-t-4xl');
  });

  it('switches presentation when the window is resized', async () => {
    setWidth(1280);
    render(<ResponsiveDialog open onOpenChange={() => undefined} title="Thêm công thức" />);
    await screen.findByRole('dialog');
    act(() => {
      setWidth(500);
      window.dispatchEvent(new Event('resize'));
    });
    await waitFor(() => expect(screen.getByRole('dialog').className).toContain('rounded-t-4xl'));
  });
});

describe('ConfirmDialog', () => {
  function ConfirmHarness({ onConfirm, destructive }: { onConfirm: () => void; destructive?: boolean }) {
    const [open, setOpen] = useState(true);
    return (
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Ngắt kết nối Google?"
        description="Dữ liệu trên máy này được giữ nguyên."
        confirmLabel="Ngắt kết nối"
        cancelLabel="Giữ kết nối"
        destructive={destructive}
        onConfirm={onConfirm}
      />
    );
  }

  it('is an alertdialog with title and description', async () => {
    render(<ConfirmHarness onConfirm={() => undefined} />);
    const dialog = await screen.findByRole('alertdialog', { name: 'Ngắt kết nối Google?' });
    expect(dialog).toHaveAccessibleDescription('Dữ liệu trên máy này được giữ nguyên.');
  });

  it('calls onConfirm and closes when confirmed', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmHarness onConfirm={onConfirm} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Ngắt kết nối' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('closes without confirming on cancel', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmHarness onConfirm={onConfirm} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Giữ kết nối' }));
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('closes with Escape without confirming', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmHarness onConfirm={onConfirm} />);
    await screen.findByRole('alertdialog');
    await userEvent.keyboard('{Escape}');
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('styles the confirm button as destructive when asked', async () => {
    render(<ConfirmHarness onConfirm={() => undefined} destructive />);
    expect((await screen.findByRole('button', { name: 'Ngắt kết nối' })).className).toContain('bg-destructive');
  });

  it('keeps the confirm button primary by default', async () => {
    render(<ConfirmHarness onConfirm={() => undefined} />);
    expect((await screen.findByRole('button', { name: 'Ngắt kết nối' })).className).toContain('bg-primary');
  });
});
