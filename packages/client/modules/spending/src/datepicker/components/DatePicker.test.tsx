import { renderWithProviders } from '@alavo-daily/common/testing';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { DatePicker } from './DatePicker';

const TODAY = '2026-10-09';

function Harness({ initial = TODAY, onChange }: { initial?: string; onChange?: (date: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <DatePicker
      label="Ngày"
      value={value}
      today={TODAY}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

async function openPicker() {
  await userEvent.click(screen.getByRole('button', { name: /^Ngày: / }));
  return screen.findByRole('grid');
}

describe('DatePicker', () => {
  it('shows the chosen day with a relative label on the trigger', () => {
    renderWithProviders(<Harness initial="2026-10-08" />);
    expect(screen.getByRole('button', { name: 'Ngày: Hôm qua · 8/10' })).toBeInTheDocument();
  });

  it('adds the year when the date is not in the current year', () => {
    renderWithProviders(<Harness initial="2025-03-02" />);
    expect(screen.getByRole('button', { name: 'Ngày: Chủ Nhật · 2/3/2025' })).toBeInTheDocument();
  });

  it('opens a month grid with weekday headers starting on Monday', async () => {
    renderWithProviders(<Harness />);
    const grid = await openPicker();
    const headers = within(grid).getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']);
    expect(within(grid).getAllByRole('button')).toHaveLength(31);
  });

  it('marks today and the selected day', async () => {
    renderWithProviders(<Harness initial="2026-10-05" />);
    await openPicker();
    expect(screen.getByRole('button', { name: '9 tháng 10, 2026' })).toHaveAttribute('aria-current', 'date');
    expect(screen.getByRole('button', { name: '5 tháng 10, 2026' }).closest('[role=gridcell]')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('selects a date by click and closes', async () => {
    const onChange = recorder();
    renderWithProviders(<Harness onChange={onChange.fn} />);
    await openPicker();
    await userEvent.click(screen.getByRole('button', { name: '12 tháng 10, 2026' }));
    expect(onChange.calls).toEqual(['2026-10-12']);
    await waitFor(() => expect(screen.queryByRole('grid')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Ngày: .*12\/10/ })).toBeInTheDocument();
  });

  it('moves focus with the arrow keys and selects with Enter', async () => {
    const onChange = recorder();
    renderWithProviders(<Harness onChange={onChange.fn} />);
    await openPicker();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: '8 tháng 10, 2026' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('button', { name: '1 tháng 10, 2026' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onChange.calls).toEqual(['2026-10-01']);
  });

  it('crosses into the previous month when an arrow leaves the grid', async () => {
    renderWithProviders(<Harness initial="2026-10-01" />);
    await openPicker();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('grid', { name: 'Tháng 9, 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30 tháng 9, 2026' })).toHaveFocus();
  });

  it('jumps a month with Page Down', async () => {
    renderWithProviders(<Harness />);
    await openPicker();
    await userEvent.keyboard('{PageDown}');
    expect(screen.getByRole('grid', { name: 'Tháng 11, 2026' })).toBeInTheDocument();
  });

  it('navigates months with the header buttons and keeps the day when it exists', async () => {
    const onChange = recorder();
    renderWithProviders(<Harness initial="2026-01-31" onChange={onChange.fn} />);
    await openPicker();
    await userEvent.click(screen.getByRole('button', { name: 'Tháng sau' }));
    expect(screen.getByRole('grid', { name: 'Tháng 2, 2026' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '28 tháng 2, 2026' }));
    expect(onChange.calls).toEqual(['2026-02-28']);
  });

  it('goes back a month with the previous button', async () => {
    renderWithProviders(<Harness />);
    await openPicker();
    await userEvent.click(screen.getByRole('button', { name: 'Tháng trước' }));
    expect(screen.getByRole('grid', { name: 'Tháng 9, 2026' })).toBeInTheDocument();
  });

  it('jumps to today with the shortcut button', async () => {
    const onChange = recorder();
    renderWithProviders(<Harness initial="2026-03-01" onChange={onChange.fn} />);
    await openPicker();
    await userEvent.click(screen.getByRole('button', { name: 'Hôm nay' }));
    expect(onChange.calls).toEqual([TODAY]);
  });

  it('closes with Escape without changing the value', async () => {
    const onChange = recorder();
    renderWithProviders(<Harness onChange={onChange.fn} />);
    await openPicker();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('grid')).not.toBeInTheDocument());
    expect(onChange.calls).toEqual([]);
  });
});

function recorder() {
  const calls: string[] = [];
  return { calls, fn: (date: string) => calls.push(date) };
}
