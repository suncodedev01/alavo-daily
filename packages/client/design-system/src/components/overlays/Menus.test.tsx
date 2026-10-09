import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../controls/Button';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from './Menu';
import { OptionPicker } from './OptionPicker';
import { Popover } from './Popover';

const OPTIONS = [
  { value: 'tcb', label: 'Techcombank', hint: '38.420.000 ₫' },
  { value: 'momo', label: 'Ví MoMo' },
  { value: 'cash', label: 'Tiền mặt' },
];

function PickerHarness({ onPick }: { onPick?: (value: string) => void }) {
  const [value, setValue] = useState<string | null>('tcb');
  return (
    <div>
      <OptionPicker
        label="Ví"
        value={value}
        onChange={(next) => {
          setValue(next);
          onPick?.(next);
        }}
        options={OPTIONS}
      />
      <button type="button">Ngoài</button>
    </div>
  );
}

function MenuHarness({ onEdit }: { onEdit?: () => void }) {
  return (
    <div>
      <Menu trigger={<Button>Tuỳ chọn</Button>}>
        <MenuLabel>Giao dịch</MenuLabel>
        <MenuItem onSelect={onEdit}>Chỉnh sửa</MenuItem>
        <MenuItem icon="copy" hint="Ctrl+D">Nhân bản</MenuItem>
        <MenuSeparator />
        <MenuItem destructive>Xoá giao dịch</MenuItem>
      </Menu>
      <button type="button">Ngoài</button>
    </div>
  );
}

describe('Menu', () => {
  it('opens from the trigger and lists items', async () => {
    render(<MenuHarness />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn' }));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    expect(screen.getByText('Giao dịch')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+D')).toBeInTheDocument();
  });

  it('moves highlight with arrow keys and runs the item on Enter', async () => {
    const onEdit = vi.fn();
    render(<MenuHarness onEdit={onEdit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn' }));
    await screen.findByRole('menu');
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Chỉnh sửa' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: /Nhân bản/ })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}{Enter}');
    expect(onEdit).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('closes with Escape and returns focus to the trigger', async () => {
    render(<MenuHarness />);
    const trigger = screen.getByRole('button', { name: 'Tuỳ chọn' });
    await userEvent.click(trigger);
    await screen.findByRole('menu');
    await userEvent.keyboard('{ArrowDown}{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('closes on outside click', async () => {
    render(<MenuHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn' }));
    await screen.findByRole('menu');
    await userEvent.click(screen.getByRole('button', { name: 'Ngoài' }));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('reports open state through onOpenChange', async () => {
    const onOpenChange = vi.fn();
    render(
      <Menu trigger={<Button>Mở</Button>} onOpenChange={onOpenChange}>
        <MenuItem>Một</MenuItem>
      </Menu>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Mở' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(true));
  });
});

describe('OptionPicker', () => {
  it('shows the selected option on the trigger with an accessible name', () => {
    render(<PickerHarness />);
    expect(screen.getByRole('button', { name: 'Ví: Techcombank' })).toBeInTheDocument();
  });

  it('marks the selected option as checked when open', async () => {
    render(<PickerHarness />);
    await userEvent.click(screen.getByRole('button', { name: /Ví:/ }));
    expect(await screen.findByRole('menuitemradio', { name: /Techcombank/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: 'Ví MoMo' })).toHaveAttribute('aria-checked', 'false');
  });

  it('selects with arrow keys and Enter, then shows the new value', async () => {
    const onPick = vi.fn();
    render(<PickerHarness onPick={onPick} />);
    await userEvent.click(screen.getByRole('button', { name: /Ví:/ }));
    await screen.findByRole('menu');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onPick).toHaveBeenCalledWith('momo');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ví: Ví MoMo' })).toBeInTheDocument());
  });

  it('selects with a click', async () => {
    const onPick = vi.fn();
    render(<PickerHarness onPick={onPick} />);
    await userEvent.click(screen.getByRole('button', { name: /Ví:/ }));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Tiền mặt' }));
    expect(onPick).toHaveBeenCalledWith('cash');
  });

  it('closes with Escape and restores focus to the trigger without changing the value', async () => {
    const onPick = vi.fn();
    render(<PickerHarness onPick={onPick} />);
    const trigger = screen.getByRole('button', { name: /Ví:/ });
    await userEvent.click(trigger);
    await screen.findByRole('menu');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(onPick).not.toHaveBeenCalled();
  });

  it('closes on outside click', async () => {
    render(<PickerHarness />);
    await userEvent.click(screen.getByRole('button', { name: /Ví:/ }));
    await screen.findByRole('menu');
    await userEvent.click(screen.getByRole('button', { name: 'Ngoài' }));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('shows the placeholder when nothing is selected', () => {
    render(<OptionPicker value={null} onChange={() => undefined} options={OPTIONS} placeholder="Chọn ví" />);
    expect(screen.getByRole('button', { name: 'Chọn ví' })).toBeInTheDocument();
  });

  it('does not render a native select element', () => {
    const { container } = render(<PickerHarness />);
    expect(container.querySelector('select')).toBeNull();
  });
});

describe('Popover', () => {
  function PopoverHarness() {
    return (
      <div>
        <Popover trigger={<Button>Chi tiết</Button>} label="Chi tiết ngân sách">
          <p>Ăn uống đã dùng 88%</p>
        </Popover>
        <button type="button">Ngoài</button>
      </div>
    );
  }

  it('opens on click and shows its content', async () => {
    render(<PopoverHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết' }));
    expect(await screen.findByText('Ăn uống đã dùng 88%')).toBeInTheDocument();
  });

  it('closes with Escape and returns focus to the trigger', async () => {
    render(<PopoverHarness />);
    const trigger = screen.getByRole('button', { name: 'Chi tiết' });
    await userEvent.click(trigger);
    await screen.findByText('Ăn uống đã dùng 88%');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByText('Ăn uống đã dùng 88%')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('closes on outside click', async () => {
    render(<PopoverHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết' }));
    await screen.findByText('Ăn uống đã dùng 88%');
    await userEvent.click(screen.getByRole('button', { name: 'Ngoài' }));
    await waitFor(() => expect(screen.queryByText('Ăn uống đã dùng 88%')).not.toBeInTheDocument());
  });
});
