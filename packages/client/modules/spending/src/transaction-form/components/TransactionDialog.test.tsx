import { EngineCallError } from '@alavo-daily/common/engine';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createDemoData } from '../../testing/fixtures';
import { freezeToday, NARROW_WIDTH, renderInSpendingShell, type SpendingRenderOptions } from '../../testing/renderSpending';
import { TransactionDialog } from './TransactionDialog';

freezeToday();

function openDialog(options: SpendingRenderOptions & { editingId?: string } = {}) {
  const data = options.data ?? createDemoData();
  const editing = data.transactions.find((item) => item.id === options.editingId) ?? null;
  const onOpenChange = vi.fn();
  const onSaved = vi.fn();
  const view = renderInSpendingShell(
    <TransactionDialog open onOpenChange={onOpenChange} editing={editing} onSaved={onSaved} />,
    { ...options, data },
  );
  return { ...view, onOpenChange, onSaved };
}

async function typeAmount(text: string) {
  await userEvent.type(await screen.findByRole('textbox', { name: 'Số tiền' }), text);
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Lưu giao dịch' }));

describe('TransactionDialog layout', () => {
  it('offers the expense categories, a new-category tile, wallet, date and recurring switch', async () => {
    openDialog();
    expect(await screen.findByRole('dialog', { name: 'Thêm giao dịch' })).toBeInTheDocument();
    const categories = await screen.findByRole('group', { name: 'Hạng mục' });
    const names = within(categories).getAllByRole('button').map((button) => button.textContent);
    expect(names).toEqual(['Ăn uống', 'Đi lại', 'Mua sắm', 'Nhà ở', 'Hoá đơn', 'Hạng mục mới']);
    expect(screen.getByRole('button', { name: 'Techcombank', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ngày: Hôm nay · 9/10' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Lặp lại hằng tháng' })).not.toBeChecked();
  });

  it('starts as an expense in the first category', async () => {
    openDialog();
    expect(await screen.findByRole('radio', { name: 'Chi tiêu' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Ăn uống', pressed: true })).toBeInTheDocument();
  });
});

describe('money typing', () => {
  it('formats the amount with thousands separators while typing', async () => {
    openDialog();
    await typeAmount('1250000');
    expect(screen.getByRole('textbox', { name: 'Số tiền' })).toHaveValue('1.250.000');
  });

  it('ignores letters and leading zeros', async () => {
    openDialog();
    await typeAmount('0a0b12');
    expect(screen.getByRole('textbox', { name: 'Số tiền' })).toHaveValue('12');
  });
});

describe('validation', () => {
  it('shows an inline message and does not call the engine when the amount is empty', async () => {
    const { engine } = openDialog();
    await findAndSave();
    expect(await screen.findByText('Nhập số tiền lớn hơn 0.')).toBeInTheDocument();
    expect(engine.callsTo('spending.record_transaction')).toHaveLength(0);
  });

  it('asks how the person paid when there is no payment method', async () => {
    const data = createDemoData();
    data.wallets = [];
    const { engine } = openDialog({ data });
    await typeAmount('5000');
    await save();
    expect(await screen.findByText('Hãy chọn hình thức thanh toán.')).toBeInTheDocument();
    expect(engine.callsTo('spending.record_transaction')).toHaveLength(0);
  });

  it('shows the engine error in Vietnamese when saving fails', async () => {
    const { engine } = openDialog({
      handlers: {
        'spending.record_transaction': () => {
          throw new EngineCallError('validation', 'amountVnd must not be zero');
        },
      },
    });
    await typeAmount('5000');
    await save();
    expect(await screen.findByText('Số tiền phải khác 0.')).toBeInTheDocument();
    expect(engine.callsTo('spending.record_transaction')).toHaveLength(1);
  });
});

async function findAndSave() {
  await screen.findByRole('textbox', { name: 'Số tiền' });
  await save();
}

describe('saving', () => {
  it('records spending as a negative amount in the chosen category, with the note as title', async () => {
    const { engine, onSaved, onOpenChange } = openDialog();
    await typeAmount('65000');
    await userEvent.click(screen.getByRole('button', { name: 'Đi lại' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Ghi chú' }), 'Grab đi làm');
    await save();
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(engine.callsTo('spending.record_transaction')).toEqual([
      {
        title: 'Grab đi làm',
        amountVnd: -65_000,
        categoryId: 'category-transport',
        walletId: 'wallet-tcb',
        occurredOn: '2026-10-09',
        recurringRule: null,
      },
    ]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('falls back to the category name when the note is empty', async () => {
    const { engine } = openDialog();
    await typeAmount('1000');
    await save();
    await waitFor(() => expect(engine.callsTo('spending.record_transaction')).toHaveLength(1));
    expect(engine.callsTo('spending.record_transaction')[0]).toMatchObject({ title: 'Ăn uống' });
  });

  it('records income as a positive amount in an income category', async () => {
    const { engine } = openDialog();
    await userEvent.click(await screen.findByRole('radio', { name: 'Thu nhập' }));
    const categories = screen.getByRole('group', { name: 'Hạng mục' });
    expect(within(categories).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Thu nhập',
      'Hạng mục mới',
    ]);
    expect(screen.getByRole('button', { name: 'Thu nhập', pressed: true })).toBeInTheDocument();
    await typeAmount('5000000');
    await save();
    await waitFor(() => expect(engine.callsTo('spending.record_transaction')).toHaveLength(1));
    expect(engine.callsTo('spending.record_transaction')[0]).toMatchObject({
      amountVnd: 5_000_000,
      categoryId: 'category-income',
    });
  });

  it('writes a monthly rule on the chosen day when the recurring switch is on', async () => {
    const { engine } = openDialog();
    await typeAmount('260000');
    await userEvent.click(screen.getByRole('switch', { name: 'Lặp lại hằng tháng' }));
    await save();
    await waitFor(() => expect(engine.callsTo('spending.record_transaction')).toHaveLength(1));
    expect(engine.callsTo('spending.record_transaction')[0]).toMatchObject({ recurringRule: 'monthly:9' });
  });

  it('saves the date picked in the custom date picker', async () => {
    const { engine } = openDialog();
    await typeAmount('1000');
    await userEvent.click(screen.getByRole('button', { name: /^Ngày: / }));
    await userEvent.click(await screen.findByRole('button', { name: '5 tháng 10, 2026' }));
    expect(screen.getByRole('button', { name: /^Ngày: .*5\/10/ })).toBeInTheDocument();
    await save();
    await waitFor(() => expect(engine.callsTo('spending.record_transaction')).toHaveLength(1));
    expect(engine.callsTo('spending.record_transaction')[0]).toMatchObject({ occurredOn: '2026-10-05' });
  });
});

describe('creating a category from the form', () => {
  async function openCategoryDialog() {
    await userEvent.click(await screen.findByRole('button', { name: 'Hạng mục mới' }));
    return screen.findByRole('dialog', { name: 'Hạng mục mới' });
  }

  it('creates an expense category with an icon and a budget, then selects it', async () => {
    const { engine } = openDialog();
    const dialog = await openCategoryDialog();
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Tên hạng mục' }), 'Thú cưng');
    await userEvent.click(within(dialog).getByRole('button', { name: 'paw-print' }));
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Ngân sách tháng' }), '500000');
    expect(within(dialog).getByRole('textbox', { name: 'Ngân sách tháng' })).toHaveValue('500.000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo hạng mục' }));
    expect(await screen.findByRole('button', { name: 'Thú cưng', pressed: true })).toBeInTheDocument();
    expect(engine.callsTo('spending.create_category')).toEqual([
      { name: 'Thú cưng', icon: 'paw-print', kind: 'expense', budgetVnd: 500_000 },
    ]);
  });

  it('creates a category without a budget when the budget is left empty', async () => {
    const { engine } = openDialog();
    const dialog = await openCategoryDialog();
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Tên hạng mục' }), 'Quà tặng');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo hạng mục' }));
    await waitFor(() => expect(engine.callsTo('spending.create_category')).toHaveLength(1));
    expect(engine.callsTo('spending.create_category')[0]).toMatchObject({ budgetVnd: null });
  });

  it('asks for a name before creating', async () => {
    const { engine } = openDialog();
    const dialog = await openCategoryDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo hạng mục' }));
    expect(await within(dialog).findByText('Nhập tên hạng mục.')).toBeInTheDocument();
    expect(engine.callsTo('spending.create_category')).toHaveLength(0);
  });

  it('hides the budget field for an income category', async () => {
    openDialog();
    await userEvent.click(await screen.findByRole('radio', { name: 'Thu nhập' }));
    const dialog = await openCategoryDialog();
    expect(within(dialog).queryByRole('textbox', { name: 'Ngân sách tháng' })).not.toBeInTheDocument();
  });
});

describe('editing', () => {
  it('prefills the form from the transaction and updates it', async () => {
    const data = createDemoData();
    const coffee = data.transactions.find((item) => item.title === 'Highlands Coffee' && item.amountVnd === -65_000)!;
    const { engine } = openDialog({ data, editingId: coffee.id });
    expect(await screen.findByRole('dialog', { name: 'Sửa giao dịch' })).toBeInTheDocument();
    expect(await screen.findByRole('textbox', { name: 'Số tiền' })).toHaveValue('65.000');
    expect(screen.getByRole('textbox', { name: 'Ghi chú' })).toHaveValue('Highlands Coffee');
    const amount = screen.getByRole('textbox', { name: 'Số tiền' });
    await userEvent.clear(amount);
    await userEvent.type(amount, '70000');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(engine.callsTo('spending.update_transaction')).toHaveLength(1));
    expect(engine.callsTo('spending.update_transaction')[0]).toMatchObject({ id: coffee.id, amountVnd: -70_000 });
  });
});

describe('narrow layout', () => {
  it('uses a numeric keypad instead of a text field', async () => {
    const { engine } = openDialog({ width: NARROW_WIDTH });
    const keypad = await screen.findByRole('group', { name: 'Bàn phím nhập số tiền' });
    expect(screen.queryByRole('textbox', { name: 'Số tiền' })).not.toBeInTheDocument();
    await userEvent.click(within(keypad).getByRole('button', { name: '1' }));
    await userEvent.click(within(keypad).getByRole('button', { name: '2' }));
    await userEvent.click(within(keypad).getByRole('button', { name: '000' }));
    expect(screen.getByRole('status', { name: 'Số tiền' })).toHaveTextContent('12.000 ₫');
    await userEvent.click(within(keypad).getByRole('button', { name: 'Xoá chữ số cuối' }));
    expect(screen.getByRole('status', { name: 'Số tiền' })).toHaveTextContent('1.200 ₫');
    await save();
    await waitFor(() => expect(engine.callsTo('spending.record_transaction')).toHaveLength(1));
    expect(engine.callsTo('spending.record_transaction')[0]).toMatchObject({ amountVnd: -1_200 });
  });

  it('lists categories as chips inside a bottom sheet', async () => {
    openDialog({ width: NARROW_WIDTH });
    const categories = await screen.findByRole('group', { name: 'Hạng mục' });
    expect(within(categories).getByRole('button', { name: 'Đi lại' })).toBeInTheDocument();
  });
});

describe('loading state', () => {
  it('shows a skeleton while categories and wallets load', () => {
    openDialog({
      handlers: {
        'spending.list_categories': () => new Promise(() => undefined),
      },
    });
    expect(screen.getByRole('dialog', { name: 'Thêm giao dịch' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Đang tải' })).toBeInTheDocument();
  });
});
