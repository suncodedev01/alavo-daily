import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { createDemoData } from '../../testing/fixtures';
import { freezeToday, renderInSpendingShell, type SpendingRenderOptions } from '../../testing/renderSpending';
import { PaymentMethodsDialog } from './PaymentMethodsDialog';

freezeToday();

function Harness() {
  const [open, setOpen] = useState(true);
  return <PaymentMethodsDialog open={open} onOpenChange={setOpen} />;
}

async function openDialog(options: SpendingRenderOptions = {}) {
  const view = renderInSpendingShell(<Harness />, options);
  const dialog = await screen.findByRole('dialog', { name: 'Hình thức thanh toán' });
  await within(dialog).findByText('Chuyển khoản');
  return { ...view, dialog };
}

describe('payment methods dialog', () => {
  it('lists the methods, marks cash as the default and counts how many transactions use each', async () => {
    const data = createDemoData();
    data.transactions = data.transactions.map((item, index) =>
      index < 2 ? { ...item, paymentMethodId: 'payment-bank' } : item,
    );
    const { dialog } = await openDialog({ data });
    expect(within(dialog).getByText(/Mặc định · Tiền mặt là hình thức mặc định/)).toBeInTheDocument();
    expect(within(dialog).getByText('Dùng cho 2 giao dịch')).toBeInTheDocument();
    expect(within(dialog).getByText('Dùng cho 0 giao dịch')).toBeInTheDocument();
  });

  it('cannot delete the default method but can delete the others', async () => {
    const { dialog } = await openDialog();
    expect(within(dialog).queryByRole('button', { name: 'Xoá hình thức Tiền mặt' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Xoá hình thức Chuyển khoản' })).toBeInTheDocument();
  });

  it('adds a method with a name and an icon', async () => {
    const { engine, dialog } = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thêm hình thức' }));
    const form = await screen.findByRole('dialog', { name: 'Thêm hình thức thanh toán' });
    await userEvent.type(within(form).getByRole('textbox', { name: 'Tên hình thức' }), 'Thẻ Visa');
    await userEvent.click(within(form).getByRole('button', { name: 'Đồng xu' }));
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu hình thức' }));
    await waitFor(() =>
      expect(engine.callsTo('spending.create_payment_method')).toEqual([{ name: 'Thẻ Visa', icon: 'coins' }]),
    );
    const list = await screen.findByRole('dialog', { name: 'Hình thức thanh toán' });
    expect(await within(list).findByText('Thẻ Visa')).toBeInTheDocument();
  });

  it('asks for a name before saving', async () => {
    const { engine, dialog } = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thêm hình thức' }));
    const form = await screen.findByRole('dialog', { name: 'Thêm hình thức thanh toán' });
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu hình thức' }));
    expect(await within(form).findByText('Nhập tên hình thức.')).toBeInTheDocument();
    expect(engine.callsTo('spending.create_payment_method')).toHaveLength(0);
  });

  it('renames a method', async () => {
    const { engine, dialog } = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sửa hình thức Chuyển khoản' }));
    const form = await screen.findByRole('dialog', { name: 'Sửa hình thức thanh toán' });
    const name = within(form).getByRole('textbox', { name: 'Tên hình thức' });
    expect(name).toHaveValue('Chuyển khoản');
    await userEvent.clear(name);
    await userEvent.type(name, 'Chuyển khoản nhanh');
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu hình thức' }));
    await waitFor(() =>
      expect(engine.callsTo('spending.update_payment_method')).toEqual([
        { id: 'payment-bank', name: 'Chuyển khoản nhanh', icon: 'bank' },
      ]),
    );
  });

  it('keeps the transactions when a method is deleted, after confirmation', async () => {
    const { engine, dialog } = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xoá hình thức Ví điện tử' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Xoá hình thức Ví điện tử?' });
    expect(confirm).toHaveTextContent('vẫn được giữ');
    await userEvent.click(within(confirm).getByRole('button', { name: 'Xoá' }));
    await waitFor(() =>
      expect(engine.callsTo('spending.delete_payment_method')).toEqual([{ id: 'payment-ewallet' }]),
    );
    await waitFor(() => expect(within(dialog).queryByText('Ví điện tử')).not.toBeInTheDocument());
  });
});
