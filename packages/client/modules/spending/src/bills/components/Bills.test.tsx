import { EngineCallError } from '@alavo-daily/common/engine';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { createDemoData } from '../../testing/fixtures';
import { freezeToday, renderInSpendingShell, type SpendingRenderOptions } from '../../testing/renderSpending';
import { BillsDialog } from './BillsDialog';

freezeToday();

function Harness() {
  const [open, setOpen] = useState(true);
  return <BillsDialog open={open} onOpenChange={setOpen} />;
}

async function openDialog(options: SpendingRenderOptions = {}) {
  const view = renderInSpendingShell(<Harness />, options);
  const dialog = await screen.findByRole('dialog', { name: 'Khoản định kỳ' });
  return { ...view, dialog };
}

describe('bills dialog list', () => {
  it('lists bills with the day of month and amount and marks paused ones', async () => {
    const { dialog } = await openDialog();
    expect(await within(dialog).findByText('Ngày 12 hằng tháng · 2.340.000 ₫')).toBeInTheDocument();
    expect(within(dialog).getByText('Ngày 15 hằng tháng · 230.000 ₫')).toBeInTheDocument();
    expect(within(dialog).getByText('Ngày 18 hằng tháng · 260.000 ₫ · Tạm dừng')).toBeInTheDocument();
  });

  it('shows skeletons while loading', async () => {
    const { dialog } = await openDialog({ handlers: { 'spending.list_bills': () => new Promise(() => undefined) } });
    expect(within(dialog).getByRole('status', { name: 'Đang tải' })).toBeInTheDocument();
  });

  it('shows an error with retry', async () => {
    const { dialog } = await openDialog({
      handlers: {
        'spending.list_bills': () => {
          throw new EngineCallError('internal', 'boom');
        },
      },
    });
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Có lỗi xảy ra');
  });

  it('shows an empty state with a call to action', async () => {
    const { dialog } = await openDialog({ data: { ...createDemoData(), bills: [] } });
    expect(await within(dialog).findByText('Chưa có khoản định kỳ nào')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Thêm khoản định kỳ' })).toBeInTheDocument();
  });
});

describe('creating a bill', () => {
  async function openForm(dialog: HTMLElement) {
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thêm khoản định kỳ' }));
    return screen.findByRole('dialog', { name: 'Thêm khoản định kỳ' });
  }

  it('saves title, icon, amount, day and active flag', async () => {
    const { engine, dialog } = await openDialog();
    const form = await openForm(dialog);
    await userEvent.type(within(form).getByRole('textbox', { name: 'Tên khoản định kỳ' }), 'Điện EVN');
    await userEvent.click(within(form).getByRole('button', { name: 'fire' }));
    await userEvent.type(within(form).getByRole('textbox', { name: 'Số tiền' }), '640000');
    expect(within(form).getByRole('textbox', { name: 'Số tiền' })).toHaveValue('640.000');
    const stepper = within(form).getByRole('group', { name: 'Ngày trả trong tháng' });
    await userEvent.click(within(stepper).getByRole('button', { name: 'Tới một ngày' }));
    await userEvent.click(within(stepper).getByRole('button', { name: 'Tới một ngày' }));
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu khoản định kỳ' }));
    await waitFor(() => expect(engine.callsTo('spending.save_bill')).toHaveLength(1));
    expect(engine.callsTo('spending.save_bill')[0]).toEqual({
      id: undefined,
      title: 'Điện EVN',
      icon: 'fire',
      amountVnd: 640_000,
      dayOfMonth: 3,
      active: true,
    });
    expect(await within(await screen.findByRole('dialog', { name: 'Khoản định kỳ' })).findByText('Điện EVN')).toBeInTheDocument();
  });

  it('keeps the day between 1 and 31', async () => {
    const { dialog } = await openDialog();
    const form = await openForm(dialog);
    const stepper = within(form).getByRole('group', { name: 'Ngày trả trong tháng' });
    expect(within(stepper).getByRole('button', { name: 'Lùi một ngày' })).toBeDisabled();
  });

  it('asks for a title and an amount', async () => {
    const { engine, dialog } = await openDialog();
    const form = await openForm(dialog);
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu khoản định kỳ' }));
    expect(await within(form).findByText('Nhập tên khoản định kỳ.')).toBeInTheDocument();
    await userEvent.type(within(form).getByRole('textbox', { name: 'Tên khoản định kỳ' }), 'Nước');
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu khoản định kỳ' }));
    expect(await within(form).findByText('Nhập số tiền lớn hơn 0.')).toBeInTheDocument();
    expect(engine.callsTo('spending.save_bill')).toHaveLength(0);
  });

  it('shows the engine error in Vietnamese', async () => {
    const { dialog } = await openDialog({
      handlers: {
        'spending.save_bill': () => {
          throw new EngineCallError('validation', 'dayOfMonth must be between 1 and 31');
        },
      },
    });
    const form = await openForm(dialog);
    await userEvent.type(within(form).getByRole('textbox', { name: 'Tên khoản định kỳ' }), 'Nước');
    await userEvent.type(within(form).getByRole('textbox', { name: 'Số tiền' }), '1000');
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu khoản định kỳ' }));
    expect(await within(form).findByText('Ngày trong tháng phải từ 1 đến 31.')).toBeInTheDocument();
  });
});

describe('editing and deleting a bill', () => {
  it('edits a bill and can pause it', async () => {
    const { engine, dialog } = await openDialog();
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Sửa khoản Internet FPT' }));
    const form = await screen.findByRole('dialog', { name: 'Sửa khoản định kỳ' });
    expect(within(form).getByRole('textbox', { name: 'Tên khoản định kỳ' })).toHaveValue('Internet FPT');
    expect(within(form).getByRole('switch', { name: 'Đang theo dõi khoản này' })).toBeChecked();
    await userEvent.click(within(form).getByRole('switch', { name: 'Đang theo dõi khoản này' }));
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu khoản định kỳ' }));
    await waitFor(() => expect(engine.callsTo('spending.save_bill')).toHaveLength(1));
    expect(engine.callsTo('spending.save_bill')[0]).toMatchObject({ id: 'bill-2', active: false, dayOfMonth: 15 });
    expect(await within(await screen.findByRole('dialog', { name: 'Khoản định kỳ' })).findByText(/Ngày 15 hằng tháng · 230\.000 ₫ · Tạm dừng/)).toBeInTheDocument();
  });

  it('deletes a bill only after confirmation', async () => {
    const { engine, dialog } = await openDialog();
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Xoá khoản Netflix' }));
    await userEvent.click(within(await screen.findByRole('alertdialog', { name: 'Xoá khoản Netflix?' })).getByRole('button', { name: 'Huỷ' }));
    expect(engine.callsTo('spending.delete_bill')).toHaveLength(0);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xoá khoản Netflix' }));
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Xoá' }));
    await waitFor(() => expect(engine.callsTo('spending.delete_bill')).toEqual([{ id: 'bill-3' }]));
    await waitFor(() => expect(within(dialog).queryByText('Netflix')).not.toBeInTheDocument());
  });
});
