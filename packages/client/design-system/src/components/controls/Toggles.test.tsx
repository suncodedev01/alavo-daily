import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';
import { Pill } from './Pill';
import { Segmented } from './Segmented';
import { Stepper } from './Stepper';
import { Switch } from './Switch';

describe('Stepper', () => {
  it('increments and decrements by step', async () => {
    const onChange = vi.fn();
    render(<Stepper label="Khẩu phần" value={4} onChange={onChange} min={1} max={8} step={2} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tăng' }));
    await userEvent.click(screen.getByRole('button', { name: 'Giảm' }));
    expect(onChange).toHaveBeenNthCalledWith(1, 6);
    expect(onChange).toHaveBeenNthCalledWith(2, 2);
  });

  it('disables the decrement button at min', () => {
    render(<Stepper value={1} onChange={() => undefined} min={1} max={8} />);
    expect(screen.getByRole('button', { name: 'Giảm' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tăng' })).toBeEnabled();
  });

  it('disables the increment button at max', () => {
    render(<Stepper value={8} onChange={() => undefined} min={1} max={8} />);
    expect(screen.getByRole('button', { name: 'Tăng' })).toBeDisabled();
  });

  it('clamps to the bounds', async () => {
    const onChange = vi.fn();
    render(<Stepper value={7} onChange={onChange} min={1} max={8} step={5} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tăng' }));
    expect(onChange).toHaveBeenCalledWith(8);
  });

  it('supports custom aria labels, formatting and a group label', () => {
    render(
      <Stepper
        label="Số lượng"
        value={3}
        onChange={() => undefined}
        decrementLabel="Bớt"
        incrementLabel="Thêm"
        format={(n) => `${n} phần`}
      />,
    );
    expect(screen.getByRole('group', { name: 'Số lượng' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bớt' })).toBeInTheDocument();
    expect(screen.getByText('3 phần')).toBeInTheDocument();
  });

  it('keeps 44px touch targets on narrow layouts', () => {
    render(<Stepper value={2} onChange={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Tăng' }).className).toContain('max-lg:size-11');
  });
});

describe('Switch', () => {
  it('toggles on click and reports the new state', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Nhắc nấu ăn" onCheckedChange={onCheckedChange} />);
    const toggle = screen.getByRole('switch', { name: 'Nhắc nấu ăn' });
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(onCheckedChange.mock.calls[0]?.[0]).toBe(true);
  });

  it('keeps the label plain when asked, for choices that are not a to-do list', async () => {
    render(<Checkbox plain>Chọn tất cả</Checkbox>);
    await userEvent.click(screen.getByRole('checkbox', { name: /Chọn tất cả/ }));
    expect(screen.getByText('Chọn tất cả').className).not.toContain('line-through');
  });

  it('toggles with the Space key', async () => {
    render(<Switch label="Nhắc" />);
    await userEvent.tab();
    await userEvent.keyboard(' ');
    expect(screen.getByRole('switch', { name: 'Nhắc' })).toBeChecked();
  });

  it('ignores clicks when disabled', async () => {
    render(<Switch label="Khoá" disabled />);
    await userEvent.click(screen.getByRole('switch', { name: 'Khoá' }));
    expect(screen.getByRole('switch', { name: 'Khoá' })).not.toBeChecked();
  });
});

describe('Checkbox', () => {
  it('toggles on click and labels itself with children', async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox onCheckedChange={onCheckedChange}>Cà chua · 500 g</Checkbox>);
    const box = screen.getByRole('checkbox', { name: /Cà chua/ });
    await userEvent.click(box);
    expect(box).toBeChecked();
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('strikes through the label once checked', async () => {
    render(<Checkbox>Gà ta</Checkbox>);
    expect(screen.getByText('Gà ta').className).not.toContain('line-through');
    await userEvent.click(screen.getByRole('checkbox', { name: /Gà ta/ }));
    expect(screen.getByText('Gà ta').className).toContain('line-through');
  });

  it('toggles with the Space key', async () => {
    render(<Checkbox label="Gừng" />);
    await userEvent.tab();
    await userEvent.keyboard(' ');
    expect(screen.getByRole('checkbox', { name: 'Gừng' })).toBeChecked();
  });

  it('supports controlled mode and disabled state', async () => {
    const { rerender } = render(<Checkbox label="Hành" checked={false} onCheckedChange={() => undefined} />);
    expect(screen.getByRole('checkbox', { name: 'Hành' })).not.toBeChecked();
    rerender(<Checkbox label="Hành" checked onCheckedChange={() => undefined} />);
    expect(screen.getByRole('checkbox', { name: 'Hành' })).toBeChecked();
    rerender(<Checkbox label="Hành" disabled checked={false} onCheckedChange={() => undefined} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Hành' }));
    expect(screen.getByRole('checkbox', { name: 'Hành' })).not.toBeChecked();
  });
});

describe('Segmented labels', () => {
  it('never wrap their text onto a second line', () => {
    render(<Segmented label="Loại" options={[{ value: 'a', label: 'Nền sáng' }]} value="a" onChange={() => undefined} />);
    expect(screen.getByRole('radio', { name: 'Nền sáng' }).className).toContain('whitespace-nowrap');
  });
});

describe('Segmented', () => {
  const options = [
    { value: 'out', label: 'Chi tiêu' },
    { value: 'in', label: 'Thu nhập' },
    { value: 'all', label: 'Tất cả' },
  ];

  it('marks the selected option and selects on click', async () => {
    const onChange = vi.fn();
    render(<Segmented label="Loại" options={options} value="out" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Chi tiêu' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Thu nhập' }));
    expect(onChange).toHaveBeenCalledWith('in');
  });

  it('moves selection with arrow keys and wraps around', async () => {
    const onChange = vi.fn();
    render(<Segmented label="Loại" options={options} value="all" onChange={onChange} />);
    screen.getByRole('radio', { name: 'Tất cả' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('out');
    expect(screen.getByRole('radio', { name: 'Chi tiêu' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('all');
  });

  it('keeps only the selected option in the tab order', () => {
    render(<Segmented label="Loại" options={options} value="in" onChange={() => undefined} />);
    expect(screen.getByRole('radio', { name: 'Thu nhập' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Chi tiêu' })).toHaveAttribute('tabindex', '-1');
  });
});

describe('Pill', () => {
  it('reports selected state through aria-pressed', () => {
    const { rerender } = render(<Pill>Tất cả</Pill>);
    expect(screen.getByRole('button', { name: 'Tất cả' })).toHaveAttribute('aria-pressed', 'false');
    rerender(<Pill selected>Tất cả</Pill>);
    expect(screen.getByRole('button', { name: 'Tất cả' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('fires onClick and respects disabled', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Pill onClick={onClick}>Chi</Pill>);
    await userEvent.click(screen.getByRole('button', { name: 'Chi' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <Pill onClick={onClick} disabled>
        Chi
      </Pill>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Chi' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
