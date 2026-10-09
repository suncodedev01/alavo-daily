import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createDemoData, type FakeData } from '../../testing/fixtures';
import { freezeToday, renderSpending } from '../../testing/renderSpending';

freezeToday();

const listPane = () => screen.getByRole('navigation', { name: 'Ngăn danh sách' });
const mainPane = () => screen.getByRole('main', { name: 'Ngăn làm việc' });

function idOf(data: FakeData, title: string): string {
  return data.transactions.find((item) => item.title === title)!.id;
}

function dataWithGeneratedCopy(): FakeData {
  const data = createDemoData();
  const template = data.transactions.find((item) => item.title === 'Internet FPT')!;
  data.transactions.push({
    ...template,
    id: `${template.id}@2026-10-08`,
    occurredOn: '2026-10-08',
    title: 'Internet FPT',
    recurringRule: null,
    recurringSourceId: template.id,
  });
  return data;
}

function generatedId(data: FakeData): string {
  return data.transactions.find((item) => item.recurringSourceId)!.id;
}

describe('the "Tự động" marker', () => {
  it('is shown on a copy made by a recurring transaction and nowhere else', async () => {
    renderSpending({ route: '/spending/transactions', data: dataWithGeneratedCopy() });
    const rows = await within(listPane()).findAllByRole('link', { name: /Internet FPT/ });
    expect(rows).toHaveLength(2);
    const marked = rows.filter((row) => within(row).queryByText('Tự động'));
    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveAttribute('href', expect.stringContaining('@2026-10-08'));
    expect(within(listPane()).getAllByText('Tự động')).toHaveLength(1);
  });

  it('is kept by the recurring filter together with the original', async () => {
    renderSpending({ route: '/spending/transactions', data: dataWithGeneratedCopy() });
    await within(listPane()).findAllByRole('link', { name: /Highlands Coffee/ });
    await userEvent.click(within(listPane()).getByRole('button', { name: 'Định kỳ' }));
    expect(within(listPane()).getAllByRole('link')).toHaveLength(3);
  });
});

describe('stopping a recurrence', () => {
  it('stops it from a generated copy by clearing the rule of the original', async () => {
    const data = dataWithGeneratedCopy();
    const original = idOf(data, 'Internet FPT');
    const { engine } = renderSpending({ route: `/spending/transactions/${generatedId(data)}`, data });
    expect(await within(mainPane()).findByText('Tự động tạo từ giao dịch lặp lại hằng tháng')).toBeInTheDocument();
    await userEvent.click(await within(mainPane()).findByRole('button', { name: 'Dừng lặp lại' }));
    await waitFor(() =>
      expect(engine.callsTo('spending.update_transaction')).toContainEqual({ id: original, recurringRule: null }),
    );
    expect(await screen.findByText('Đã dừng lặp lại. Các giao dịch đã tạo vẫn được giữ.')).toBeInTheDocument();
    await waitFor(() => expect(within(mainPane()).queryByRole('button', { name: 'Dừng lặp lại' })).not.toBeInTheDocument());
    expect(data.transactions.find((item) => item.id === original)?.recurringRule).toBeNull();
  });

  it('stops it from the original recurring transaction itself', async () => {
    const data = dataWithGeneratedCopy();
    const original = idOf(data, 'Internet FPT');
    const { engine } = renderSpending({ route: `/spending/transactions/${original}`, data });
    expect(await within(mainPane()).findByText('Hằng tháng · ngày 1')).toBeInTheDocument();
    await userEvent.click(within(mainPane()).getByRole('button', { name: 'Dừng lặp lại' }));
    await waitFor(() =>
      expect(engine.callsTo('spending.update_transaction')).toContainEqual({ id: original, recurringRule: null }),
    );
    await waitFor(() => expect(within(mainPane()).getByText('Không')).toBeInTheDocument());
  });

  it('offers nothing on a one-off transaction', async () => {
    const data = createDemoData();
    renderSpending({ route: `/spending/transactions/${idOf(data, 'Phở Thìn')}`, data });
    await within(mainPane()).findByRole('heading', { name: 'Phở Thìn' });
    expect(within(mainPane()).queryByRole('button', { name: 'Dừng lặp lại' })).not.toBeInTheDocument();
  });

  it('offers nothing on a copy whose original already stopped repeating', async () => {
    const data = dataWithGeneratedCopy();
    data.transactions.find((item) => item.title === 'Internet FPT' && !item.recurringSourceId)!.recurringRule = null;
    renderSpending({ route: `/spending/transactions/${generatedId(data)}`, data });
    await within(mainPane()).findByRole('heading', { name: 'Internet FPT' });
    expect(within(mainPane()).queryByRole('button', { name: 'Dừng lặp lại' })).not.toBeInTheDocument();
  });

  it('offers nothing on a copy whose original was deleted', async () => {
    const data = dataWithGeneratedCopy();
    const original = idOf(data, 'Internet FPT');
    const copyId = generatedId(data);
    data.transactions = data.transactions.filter((item) => item.id !== original);
    renderSpending({ route: `/spending/transactions/${copyId}`, data });
    await within(mainPane()).findByRole('heading', { name: 'Internet FPT' });
    expect(within(mainPane()).queryByRole('button', { name: 'Dừng lặp lại' })).not.toBeInTheDocument();
  });

  it('does not let a copy be turned into a new recurring transaction by editing it', async () => {
    const data = dataWithGeneratedCopy();
    renderSpending({ route: `/spending/transactions/${generatedId(data)}`, data });
    await userEvent.click(await within(mainPane()).findByRole('button', { name: 'Sửa' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sửa giao dịch' });
    expect(within(dialog).queryByRole('switch', { name: 'Lặp lại hằng tháng' })).not.toBeInTheDocument();
  });

  it('still lets the original be edited with its repeat switch', async () => {
    const data = dataWithGeneratedCopy();
    renderSpending({ route: `/spending/transactions/${idOf(data, 'Internet FPT')}`, data });
    await userEvent.click(await within(mainPane()).findByRole('button', { name: 'Sửa' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sửa giao dịch' });
    expect(within(dialog).getByRole('switch', { name: 'Lặp lại hằng tháng' })).toBeChecked();
  });
});
