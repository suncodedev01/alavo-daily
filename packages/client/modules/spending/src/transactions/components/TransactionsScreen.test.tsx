import { EngineCallError } from '@alavo-daily/common/engine';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createDemoData, createEmptyData, type FakeData } from '../../testing/fixtures';
import { freezeToday, NARROW_WIDTH, renderSpending, type SpendingRenderOptions } from '../../testing/renderSpending';

freezeToday();

const location = () => screen.getByLabelText('Địa chỉ hiện tại', { selector: 'output' });
const listPane = () => screen.getByRole('navigation', { name: 'Ngăn danh sách' });
const dockPane = () => screen.getByRole('complementary', { name: 'Bảng ngữ cảnh' });

function idOf(data: FakeData, title: string, amountVnd?: number): string {
  return data.transactions.find((item) => item.title === title && (amountVnd === undefined || item.amountVnd === amountVnd))!.id;
}

async function open(options: SpendingRenderOptions = {}) {
  const view = renderSpending({ route: '/spending/transactions', ...options });
  await within(listPane()).findByRole('link', { name: /Highlands Coffee/ }).catch(() => undefined);
  return view;
}

describe('list pane', () => {
  it('groups rows by day with relative labels and shows the count', async () => {
    const { screenInfo } = await open();
    const pane = listPane();
    expect(await within(pane).findByRole('heading', { name: 'Hôm nay · 9/10' })).toBeInTheDocument();
    expect(within(pane).getByRole('heading', { name: 'Hôm qua · 8/10' })).toBeInTheDocument();
    expect(within(pane).getByRole('heading', { name: 'Thứ Ba · 6/10' })).toBeInTheDocument();
    expect(within(pane).getByText('13/13')).toBeInTheDocument();
    expect(screenInfo.current).toMatchObject({ title: 'Giao dịch', hasList: true, listLabel: 'Danh sách giao dịch' });
  });

  it('shows the category, wallet and signed amount on each row', async () => {
    await open();
    const row = await within(listPane()).findByRole('link', { name: /Grab đi làm/ });
    expect(row).toHaveTextContent('Đi lại · Ví MoMo');
    expect(row).toHaveTextContent('−48.000 ₫');
    const salary = within(listPane()).getByRole('link', { name: /Lương tháng 10/ });
    expect(salary).toHaveTextContent('+28.000.000 ₫');
  });

  it('filters by spending, income and recurring with pressed pills', async () => {
    await open();
    const pane = listPane();
    await within(pane).findAllByRole('link', { name: /Highlands Coffee/ });
    await userEvent.click(within(pane).getByRole('button', { name: 'Thu' }));
    expect(within(pane).getByRole('button', { name: 'Thu' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(pane).getAllByRole('link')).toHaveLength(1);
    expect(within(pane).getByText('1/13')).toBeInTheDocument();
    await userEvent.click(within(pane).getByRole('button', { name: 'Định kỳ' }));
    expect(within(pane).getAllByRole('link')).toHaveLength(2);
    await userEvent.click(within(pane).getByRole('button', { name: 'Chi' }));
    expect(within(pane).getAllByRole('link')).toHaveLength(12);
    await userEvent.click(within(pane).getByRole('button', { name: 'Tất cả' }));
    expect(within(pane).getAllByRole('link')).toHaveLength(13);
  });

  it('searches by title ignoring diacritics, and by category name', async () => {
    await open();
    const pane = listPane();
    await within(pane).findAllByRole('link', { name: /Highlands Coffee/ });
    await userEvent.type(within(pane).getByRole('searchbox', { name: 'Tìm giao dịch' }), 'pho thin');
    expect(within(pane).getAllByRole('link')).toHaveLength(1);
    expect(within(pane).getByRole('link', { name: /Phở Thìn/ })).toBeInTheDocument();
    await userEvent.clear(within(pane).getByRole('searchbox', { name: 'Tìm giao dịch' }));
    await userEvent.type(within(pane).getByRole('searchbox', { name: 'Tìm giao dịch' }), 'đi lại');
    expect(within(pane).getAllByRole('link')).toHaveLength(1);
  });

  it('explains when nothing matches and clears the search with the clear button', async () => {
    await open();
    const pane = listPane();
    await within(pane).findAllByRole('link', { name: /Highlands Coffee/ });
    await userEvent.type(within(pane).getByRole('searchbox', { name: 'Tìm giao dịch' }), 'zzz');
    expect(within(pane).getByText('Không có giao dịch khớp bộ lọc.')).toBeInTheDocument();
    await userEvent.click(within(pane).getByRole('button', { name: 'Xoá tìm kiếm' }));
    expect(within(pane).getAllByRole('link')).toHaveLength(13);
  });

  it('shows skeleton rows while loading and an error with retry when loading fails', async () => {
    renderSpending({
      route: '/spending/transactions',
      handlers: { 'spending.list_transactions': () => new Promise(() => undefined) },
    });
    expect(within(listPane()).getAllByRole('status', { name: 'Đang tải' }).length).toBeGreaterThan(0);
  });

  it('shows an error state when the list cannot be loaded', async () => {
    renderSpending({
      route: '/spending/transactions',
      handlers: {
        'spending.list_transactions': () => {
          throw new EngineCallError('internal', 'boom');
        },
      },
    });
    const alert = await within(listPane()).findByRole('alert');
    expect(alert).toHaveTextContent('Có lỗi xảy ra');
    expect(within(alert).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('invites the first transaction when the month is empty and opens the add dialog', async () => {
    renderSpending({ route: '/spending/transactions', data: createEmptyData() });
    expect(await within(listPane()).findByText('Chưa có giao dịch nào trong tháng này')).toBeInTheDocument();
    await userEvent.click(within(listPane()).getByRole('button', { name: 'Thêm giao dịch' }));
    expect(location()).toHaveTextContent('/spending/transactions?new=1');
    expect(await screen.findByRole('dialog', { name: 'Thêm giao dịch' })).toBeInTheDocument();
  });
});

describe('month switching', () => {
  it('shows another month from the switcher and keeps it in the URL', async () => {
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Tháng trước' }));
    expect(location()).toHaveTextContent('/spending/transactions?month=2026-09');
    expect(await within(listPane()).findByRole('link', { name: /Siêu thị/ })).toBeInTheDocument();
    expect(within(listPane()).getAllByRole('link')).toHaveLength(2);
  });

  it('keeps the month when a row is opened', async () => {
    await open({ route: '/spending/transactions?month=2026-09' });
    await userEvent.click(await within(listPane()).findByRole('link', { name: /Siêu thị/ }));
    expect(location()).toHaveTextContent(/^\/spending\/transactions\/tx-\d+\?month=2026-09$/);
  });
});

describe('selected record', () => {
  it('shows an empty prompt on wide when nothing is selected', async () => {
    const { screenInfo } = await open();
    expect(await screen.findByText('Chọn một giao dịch')).toBeInTheDocument();
    expect(screenInfo.current?.narrowShows).toBe('list');
    expect(screenInfo.current?.hasDock).toBe(false);
  });

  it('opens a record from the list into the URL and marks the row as current', async () => {
    const data = createDemoData();
    await open({ data });
    await userEvent.click(await within(listPane()).findByRole('link', { name: /Phở Thìn/ }));
    expect(location()).toHaveTextContent(`/spending/transactions/${idOf(data, 'Phở Thìn')}?month=2026-10`);
    expect(await screen.findByRole('heading', { name: 'Phở Thìn' })).toBeInTheDocument();
    expect(within(listPane()).getByRole('link', { name: /Phở Thìn/ })).toHaveAttribute('aria-current', 'true');
  });

  it('shows the record details', async () => {
    const data = createDemoData();
    const id = idOf(data, 'Tiền thuê nhà');
    renderSpending({ route: `/spending/transactions/${id}`, data });
    expect(await screen.findByRole('heading', { name: 'Tiền thuê nhà' })).toBeInTheDocument();
    const main = screen.getByRole('main', { name: 'Ngăn làm việc' });
    expect(within(main).getByText('−7.500.000 ₫')).toBeInTheDocument();
    expect(within(main).getByText('Techcombank')).toBeInTheDocument();
    expect(within(main).getByText('Nhà ở')).toBeInTheDocument();
    expect(within(main).getByText('5/10/2026')).toBeInTheDocument();
    expect(within(main).getByText('Hằng tháng · ngày 5')).toBeInTheDocument();
  });

  it('shows income in the income colour class family and a plus sign', async () => {
    const data = createDemoData();
    renderSpending({ route: `/spending/transactions/${idOf(data, 'Lương tháng 10')}`, data });
    const main = screen.getByRole('main', { name: 'Ngăn làm việc' });
    expect(await within(main).findByText('+28.000.000 ₫')).toBeInTheDocument();
    expect(within(main).getByText('Không')).toBeInTheDocument();
  });

  it('shows the category budget meter and other transactions of the category in the dock', async () => {
    const data = createDemoData();
    const id = idOf(data, 'Phở Thìn');
    const { screenInfo } = renderSpending({ route: `/spending/transactions/${id}`, data });
    const dock = dockPane();
    const meter = await within(dock).findByRole('progressbar', { name: 'Đã dùng ngân sách Ăn uống' });
    expect(meter).toHaveAttribute('aria-valuenow', '90');
    expect(within(dock).getByText('2.345.000 ₫ / 2.600.000 ₫ · còn 255.000 ₫')).toBeInTheDocument();
    expect(await within(dock).findByText('Cùng danh mục (4)')).toBeInTheDocument();
    expect(within(dock).queryByRole('link', { name: /Phở Thìn/ })).not.toBeInTheDocument();
    expect(screenInfo.current?.hasDock).toBe(true);
  });

  it('says when the category has no budget of its own', async () => {
    const data = createDemoData();
    renderSpending({ route: `/spending/transactions/${idOf(data, 'Tiền thuê nhà')}`, data });
    expect(await within(dockPane()).findByText('Nhà ở không có ngân sách riêng.')).toBeInTheDocument();
    expect(await within(dockPane()).findByText('Chưa có giao dịch khác.')).toBeInTheDocument();
  });

  it('shows a not-found message with a link back to the list', async () => {
    renderSpending({ route: '/spending/transactions/missing?month=2026-09' });
    expect(await screen.findByText('Không tìm thấy giao dịch')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Về danh sách giao dịch' }));
    expect(location()).toHaveTextContent('/spending/transactions?month=2026-09');
  });

  it('shows an error with retry when the record cannot be loaded', async () => {
    renderSpending({
      route: '/spending/transactions/x',
      handlers: {
        'spending.get_transaction': () => {
          throw new EngineCallError('internal', 'boom');
        },
      },
    });
    expect(await screen.findByText('Không tải được giao dịch.')).toBeInTheDocument();
  });
});

describe('edit and delete', () => {
  it('edits the record from the detail view and refreshes the list', async () => {
    const data = createDemoData();
    const id = idOf(data, 'Phở Thìn');
    const { engine } = renderSpending({ route: `/spending/transactions/${id}`, data });
    await userEvent.click(await screen.findByRole('button', { name: 'Sửa' }));
    expect(await screen.findByRole('dialog', { name: 'Sửa giao dịch' })).toBeInTheDocument();
    const note = await screen.findByRole('textbox', { name: 'Ghi chú' });
    await userEvent.clear(note);
    await userEvent.type(note, 'Phở bò');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(engine.callsTo('spending.update_transaction')).toHaveLength(1));
    expect(await within(listPane()).findByRole('link', { name: /Phở bò/ })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Phở bò' })).toBeInTheDocument();
  });

  it('asks for confirmation before deleting and keeps the record when cancelled', async () => {
    const data = createDemoData();
    const { engine } = renderSpending({ route: `/spending/transactions/${idOf(data, 'Phở Thìn')}`, data });
    await userEvent.click(await screen.findByRole('button', { name: 'Xoá' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Xoá giao dịch này?' });
    await userEvent.click(within(confirm).getByRole('button', { name: 'Huỷ' }));
    expect(engine.callsTo('spending.delete_transaction')).toHaveLength(0);
  });

  it('deletes after confirmation and goes back to the list', async () => {
    const data = createDemoData();
    const id = idOf(data, 'Phở Thìn');
    const { engine } = renderSpending({ route: `/spending/transactions/${id}?month=2026-10`, data });
    await userEvent.click(await screen.findByRole('button', { name: 'Xoá' }));
    const confirm = await screen.findByRole('alertdialog');
    await userEvent.click(within(confirm).getByRole('button', { name: 'Xoá' }));
    await waitFor(() => expect(engine.callsTo('spending.delete_transaction')).toEqual([{ id }]));
    await waitFor(() => expect(location()).toHaveTextContent('/spending/transactions?month=2026-10'));
    await waitFor(() => expect(within(listPane()).queryByRole('link', { name: /Phở Thìn/ })).not.toBeInTheDocument());
  });

  it('explains why a delete failed', async () => {
    const data = createDemoData();
    renderSpending({
      route: `/spending/transactions/${idOf(data, 'Phở Thìn')}`,
      data,
      handlers: {
        'spending.delete_transaction': () => {
          throw new EngineCallError('not_found', 'transaction not found');
        },
      },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Xoá' }));
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Xoá' }));
    const failure = await screen.findByRole('dialog', { name: 'Không xoá được giao dịch' });
    expect(failure).toHaveTextContent('Không tìm thấy dữ liệu này');
  });
});

describe('adding from the transactions screen', () => {
  async function addCoffee(options: SpendingRenderOptions) {
    const view = renderSpending({ route: '/spending/transactions?new=1', ...options });
    await userEvent.type(await screen.findByRole('textbox', { name: 'Số tiền' }), '45000');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu giao dịch' }));
    return view;
  }

  it('opens the add dialog from the new=1 parameter, saves, and selects the new record', async () => {
    const { engine } = await addCoffee({});
    await waitFor(() => expect(engine.callsTo('spending.record_transaction')).toHaveLength(1));
    await waitFor(() => expect(location()).toHaveTextContent(/^\/spending\/transactions\/[^?]+\?month=2026-10$/));
    expect(await screen.findByText('Đã lưu −45.000 ₫')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Thêm giao dịch' })).not.toBeInTheDocument();
  });

  it('closes the dialog and drops the parameter when cancelled', async () => {
    renderSpending({ route: '/spending/transactions?new=1' });
    await userEvent.click(await screen.findByRole('button', { name: 'Huỷ' }));
    await waitFor(() => expect(location()).toHaveTextContent('/spending/transactions'));
    expect(location()).not.toHaveTextContent('new=1');
  });

  it('opens the dialog from the header button', async () => {
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Thêm giao dịch' }));
    expect(await screen.findByRole('dialog', { name: 'Thêm giao dịch' })).toBeInTheDocument();
  });

  it('stays on the list on a narrow layout after saving', async () => {
    const { engine } = renderSpending({ route: '/spending/transactions?new=1', width: NARROW_WIDTH });
    const keypad = await screen.findByRole('group', { name: 'Bàn phím nhập số tiền' });
    await userEvent.click(within(keypad).getByRole('button', { name: '4' }));
    await userEvent.click(within(keypad).getByRole('button', { name: '5' }));
    await userEvent.click(within(keypad).getByRole('button', { name: '000' }));
    await userEvent.click(screen.getByRole('button', { name: 'Lưu giao dịch' }));
    await waitFor(() => expect(engine.callsTo('spending.record_transaction')).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Thêm giao dịch' })).not.toBeInTheDocument());
    expect(location()).toHaveTextContent(/^\/spending\/transactions$/);
  });
});

describe('narrow layout', () => {
  it('shows the list first when no record is selected', async () => {
    const { screenInfo } = await open({ width: NARROW_WIDTH });
    expect(screenInfo.current).toMatchObject({ narrowShows: 'list', hasList: true });
  });

  it('shows the record as its own screen with a back link and the dock content inline', async () => {
    const data = createDemoData();
    const id = idOf(data, 'Phở Thìn');
    const { screenInfo } = renderSpending({ route: `/spending/transactions/${id}?month=2026-10`, data, width: NARROW_WIDTH });
    expect(await screen.findByRole('heading', { name: 'Phở Thìn' })).toBeInTheDocument();
    expect(screenInfo.current).toMatchObject({ narrowShows: 'main', hasDock: false });
    expect(await screen.findByRole('progressbar', { name: 'Đã dùng ngân sách Ăn uống' })).toBeInTheDocument();
    expect(await screen.findByText('Cùng danh mục (4)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Giao dịch' }));
    expect(location()).toHaveTextContent('/spending/transactions?month=2026-10');
    expect(screenInfo.current?.narrowShows).toBe('list');
  });
});
