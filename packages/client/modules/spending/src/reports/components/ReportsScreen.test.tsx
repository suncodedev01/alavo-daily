import { EngineCallError } from '@alavo-daily/common/engine';
import { createFakePlatform } from '@alavo-daily/common/testing';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createEmptyData } from '../../testing/fixtures';
import { freezeToday, NARROW_WIDTH, renderSpending } from '../../testing/renderSpending';

freezeToday();

type Engine = { callsTo: (command: 'spending.report') => unknown[] };

const reportCalls = (engine: Engine) => engine.callsTo('spending.report');

async function open(options: Parameters<typeof renderSpending>[0] = {}) {
  const view = renderSpending({ route: '/spending/reports', ...options });
  await screen.findByRole('img', { name: /^Cơ cấu chi tiêu/ });
  return view;
}

describe('range presets', () => {
  it('starts on this month, from the first day to today', async () => {
    const { engine } = await open();
    expect(reportCalls(engine)).toContainEqual({ from: '2026-10-01', to: '2026-10-09' });
    expect(screen.getByRole('radio', { name: 'Tháng này' })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows the totals of the range', async () => {
    await open();
    expect(screen.getByLabelText('Thu nhập')).toHaveTextContent('+28.000.000 ₫');
    expect(screen.getByLabelText('Chi tiêu')).toHaveTextContent('10.123.000 ₫');
    expect(screen.getByLabelText('Chênh lệch')).toHaveTextContent('+17.877.000 ₫');
  });

  it('asks for the last three months when "3 tháng" is chosen', async () => {
    const { engine } = await open();
    await userEvent.click(screen.getByRole('radio', { name: '3 tháng' }));
    await waitFor(() => expect(reportCalls(engine)).toContainEqual({ from: '2026-08-01', to: '2026-10-09' }));
    expect(await screen.findByLabelText('Thu nhập')).toHaveTextContent('+55.000.000 ₫');
  });

  it('asks for the whole year when "Năm nay" is chosen', async () => {
    const { engine } = await open();
    await userEvent.click(screen.getByRole('radio', { name: 'Năm nay' }));
    await waitFor(() => expect(reportCalls(engine)).toContainEqual({ from: '2026-01-01', to: '2026-10-09' }));
  });
});

describe('custom range', () => {
  it('shows two date pickers that start from the current range', async () => {
    await open();
    expect(screen.queryByRole('button', { name: /^Từ ngày/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Tuỳ chọn' }));
    expect(screen.getByRole('button', { name: /^Từ ngày: .*1\/10/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Đến ngày: Hôm nay · 9\/10/ })).toBeInTheDocument();
  });

  it('reports the days chosen with the date pickers', async () => {
    const { engine } = await open();
    await userEvent.click(screen.getByRole('radio', { name: 'Tuỳ chọn' }));
    await userEvent.click(screen.getByRole('button', { name: /^Từ ngày/ }));
    await userEvent.click(await screen.findByRole('button', { name: '5 tháng 10, 2026' }));
    await waitFor(() => expect(reportCalls(engine)).toContainEqual({ from: '2026-10-05', to: '2026-10-09' }));
    expect(await screen.findByLabelText('Chi tiêu')).toHaveTextContent('8.150.000 ₫');
  });
});

describe('charts and table', () => {
  it('labels the donut with the biggest categories and their shares', async () => {
    await open();
    const donut = screen.getByRole('img', { name: /^Cơ cấu chi tiêu/ });
    expect(donut.getAttribute('aria-label')).toMatch(/Nhà ở 74%/);
    expect(donut.getAttribute('aria-label')).toMatch(/Ăn uống 23%/);
  });

  it('labels the monthly chart with its range', async () => {
    await open();
    expect(screen.getByRole('img', { name: 'Thu và chi theo tháng, từ T10 đến T10' })).toBeInTheDocument();
  });

  it('draws one bar pair per month of a longer range', async () => {
    await open();
    await userEvent.click(screen.getByRole('radio', { name: '3 tháng' }));
    expect(await screen.findByRole('img', { name: 'Thu và chi theo tháng, từ T8 đến T10' })).toBeInTheDocument();
  });

  it('lists every spending category in the table with count, total and share', async () => {
    await open();
    const table = screen.getByRole('table', { name: 'Chi tiết theo hạng mục' });
    const food = within(table).getByRole('row', { name: /Ăn uống/ });
    expect(food).toHaveTextContent('Ăn uống');
    expect(food).toHaveTextContent('9');
    expect(food).toHaveTextContent('2.345.000 ₫');
    expect(food).toHaveTextContent('23%');
    expect(within(table).getAllByRole('row')).toHaveLength(5);
  });

  it('switches the donut and the table to income', async () => {
    await open();
    await userEvent.click(screen.getByRole('radio', { name: 'Thu nhập' }));
    const table = screen.getByRole('table', { name: 'Chi tiết theo hạng mục' });
    expect(within(table).getByRole('row', { name: /Thu nhập/ })).toHaveTextContent('100%');
    expect(within(table).queryByRole('row', { name: /Ăn uống/ })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^Cơ cấu thu nhập/ })).toBeInTheDocument();
  });

  it('merges small categories into "Khác" after five', async () => {
    const data = createEmptyData();
    const food = data.categories.find((item) => item.id === 'category-food')!;
    const extra = ['a', 'b', 'c', 'd'].map((key, index) => ({ ...food, id: `category-extra-${key}`, name: `Phụ ${key}`, position: 10 + index }));
    data.categories.push(...extra);
    [food, ...extra, { ...food, id: 'category-home' }].forEach((category, index) => {
      data.transactions.push({
        id: `t${index}`, occurredOn: '2026-10-05', title: 'x', categoryId: category.id, walletId: 'wallet-cash',
        amountVnd: -(1000 * (index + 1)), note: '', recurringRule: null, createdAt: index, updatedAt: index,
      });
    });
    renderSpending({ route: '/spending/reports', data });
    const donut = await screen.findByRole('img', { name: /^Cơ cấu chi tiêu/ });
    expect(donut.getAttribute('aria-label')).toMatch(/Khác/);
  });
});

describe('states', () => {
  it('explains when the range has no transactions', async () => {
    renderSpending({ route: '/spending/reports', data: createEmptyData() });
    expect(await screen.findByText('Chưa có giao dịch trong khoảng này')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows an error with a retry when the report cannot be loaded', async () => {
    let fail = true;
    renderSpending({
      route: '/spending/reports',
      handlers: {
        'spending.report': () => {
          if (fail) throw new EngineCallError('db', 'boom');
          return { from: '', to: '', incomeVnd: 0, expenseVnd: 0, netVnd: 0, transactionCount: 0, categories: [], months: [] };
        },
      },
    });
    const retry = await screen.findByRole('button', { name: /Thử lại/ });
    fail = false;
    await userEvent.click(retry);
    expect(await screen.findByText('Chưa có giao dịch trong khoảng này')).toBeInTheDocument();
  });

  it('keeps working on a narrow screen', async () => {
    await open({ width: NARROW_WIDTH });
    expect(screen.getByRole('radio', { name: 'Tháng này' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Chi tiết theo hạng mục' })).toBeInTheDocument();
  });
});

describe('CSV export', () => {
  function platformWithSave() {
    const saveTextFile = vi.fn<(filename: string, content: string) => Promise<void>>(async () => undefined);
    return { saveTextFile, platform: createFakePlatform({ saveTextFile }) };
  }

  it('saves the range as a CSV file that opens correctly in Excel', async () => {
    const { saveTextFile, platform } = platformWithSave();
    const { engine } = await open({ platform });
    await userEvent.click(screen.getByRole('button', { name: 'Xuất ra bảng tính' }));
    await waitFor(() => expect(saveTextFile).toHaveBeenCalledTimes(1));
    const [filename = '', content = ''] = saveTextFile.mock.calls[0] ?? [];
    expect(filename).toBe('alavo-giao-dich-2026-10-01_2026-10-09.csv');
    expect(content.startsWith('﻿date,title,category,wallet,amount_vnd,note')).toBe(true);
    expect(content).toContain('2026-10-06,Phở Thìn,Ăn uống,Tiền mặt,-70000,');
    expect(engine.callsTo('spending.export_csv')).toEqual([{ from: '2026-10-01', to: '2026-10-09' }]);
    expect(await screen.findByText('Đã xuất 13 giao dịch ra file bảng tính')).toBeInTheDocument();
  });

  it('exports the custom range that is on screen', async () => {
    const { saveTextFile, platform } = platformWithSave();
    await open({ platform });
    await userEvent.click(screen.getByRole('radio', { name: '3 tháng' }));
    await screen.findByRole('img', { name: 'Thu và chi theo tháng, từ T8 đến T10' });
    await userEvent.click(screen.getByRole('button', { name: 'Xuất ra bảng tính' }));
    await waitFor(() => expect(saveTextFile).toHaveBeenCalled());
    expect(saveTextFile.mock.calls[0]?.[0]).toBe('alavo-giao-dich-2026-08-01_2026-10-09.csv');
  });

  it('does not save an empty file and says so', async () => {
    const { saveTextFile, platform } = platformWithSave();
    renderSpending({ route: '/spending/reports', data: createEmptyData(), platform });
    await userEvent.click(await screen.findByRole('button', { name: 'Xuất ra bảng tính' }));
    expect(await screen.findByText('Không có giao dịch nào trong khoảng này để xuất.')).toBeInTheDocument();
    expect(saveTextFile).not.toHaveBeenCalled();
  });

  it('tells the person when the file cannot be saved', async () => {
    const platform = createFakePlatform({
      saveTextFile: async () => {
        throw new Error('disk full');
      },
    });
    await open({ platform });
    await userEvent.click(screen.getByRole('button', { name: 'Xuất ra bảng tính' }));
    expect(await screen.findByText('Không lưu được file. Bạn thử lại nhé.')).toBeInTheDocument();
  });
});
