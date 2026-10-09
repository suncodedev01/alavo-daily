import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Field, TextArea } from './Field';
import { SearchField } from './SearchField';

describe('Field', () => {
  it('works as a controlled input', async () => {
    function Controlled() {
      const [value, setValue] = useState('');
      return <Field aria-label="Ghi chú" value={value} onChange={(event) => setValue(event.target.value)} />;
    }
    render(<Controlled />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Ghi chú' }), 'Cà phê');
    expect(screen.getByRole('textbox', { name: 'Ghi chú' })).toHaveValue('Cà phê');
  });

  it('forwards its ref to the input element', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Field aria-label="Tên" ref={ref} />);
    expect(ref.current).toBe(screen.getByRole('textbox', { name: 'Tên' }));
  });

  it('renders a leading icon and trailing text', () => {
    const { container } = render(<Field aria-label="Số tiền" leadingIcon="receipt" trailing="₫" />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('₫')).toBeInTheDocument();
  });

  it('flags invalid state through aria-invalid', () => {
    render(<Field aria-label="Tên hạng mục" invalid />);
    expect(screen.getByRole('textbox', { name: 'Tên hạng mục' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not accept typing when disabled', async () => {
    render(<Field aria-label="Khoá" disabled />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Khoá' }), 'abc');
    expect(screen.getByRole('textbox', { name: 'Khoá' })).toHaveValue('');
  });

  it('is reachable by keyboard focus', async () => {
    render(<Field aria-label="Ghi chú" />);
    await userEvent.tab();
    expect(screen.getByRole('textbox', { name: 'Ghi chú' })).toHaveFocus();
  });
});

describe('TextArea', () => {
  it('accepts multi-line text and shows invalid state', async () => {
    render(<TextArea aria-label="Ghi chú thêm" invalid />);
    const area = screen.getByRole('textbox', { name: 'Ghi chú thêm' });
    await userEvent.type(area, 'dòng 1{Enter}dòng 2');
    expect(area).toHaveValue('dòng 1\ndòng 2');
    expect(area).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('SearchField', () => {
  it('reports typed text through onValueChange', async () => {
    const onValueChange = vi.fn();
    render(<SearchField value="" onValueChange={onValueChange} />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm kiếm' }), 'a');
    expect(onValueChange).toHaveBeenCalledWith('a');
  });

  it('shows a clear button only when there is text and clears on click', async () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<SearchField value="" onValueChange={onValueChange} />);
    expect(screen.queryByRole('button', { name: 'Xoá tìm kiếm' })).not.toBeInTheDocument();
    rerender(<SearchField value="cà" onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Xoá tìm kiếm' }));
    expect(onValueChange).toHaveBeenCalledWith('');
  });

  it('clears with Escape', async () => {
    const onValueChange = vi.fn();
    render(<SearchField value="cà" onValueChange={onValueChange} />);
    await userEvent.type(screen.getByRole('searchbox'), '{Escape}');
    expect(onValueChange).toHaveBeenCalledWith('');
  });
});
