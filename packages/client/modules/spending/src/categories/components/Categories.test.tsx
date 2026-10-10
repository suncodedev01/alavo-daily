import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { freezeToday, renderInSpendingShell } from '../../testing/renderSpending';
import { CategoriesDialog } from './CategoriesDialog';

freezeToday();

function Harness() {
  const [open, setOpen] = useState(true);
  return <CategoriesDialog open={open} onOpenChange={setOpen} />;
}

async function openDialog() {
  const view = renderInSpendingShell(<Harness />);
  const dialog = await screen.findByRole('dialog', { name: 'Quản lý hạng mục' });
  await within(dialog).findByText('Đi lại');
  return { ...view, dialog };
}

describe('manage categories', () => {
  it('lists the expense categories and switches to the income ones', async () => {
    const { dialog } = await openDialog();
    expect(within(dialog).getByText('Ăn uống')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Thu nhập' }));
    expect(await within(dialog).findByText('Thu nhập', { selector: 'p' })).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).queryByText('Ăn uống')).not.toBeInTheDocument());
  });

  it('adds a category of the kind that is showing', async () => {
    const { engine, dialog } = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thêm hạng mục' }));
    const form = await screen.findByRole('dialog', { name: 'Hạng mục mới' });
    await userEvent.type(within(form).getByRole('textbox', { name: 'Tên hạng mục' }), 'Thú cưng');
    await userEvent.click(within(form).getByRole('button', { name: 'Tạo hạng mục' }));
    await waitFor(() =>
      expect(engine.callsTo('spending.create_category')).toEqual([
        { name: 'Thú cưng', icon: expect.any(String), budgetVnd: null, kind: 'expense' },
      ]),
    );
  });

  it('changes the name of a category and keeps its budget', async () => {
    const { engine, dialog } = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sửa hạng mục Đi lại' }));
    const form = await screen.findByRole('dialog', { name: 'Sửa hạng mục' });
    const name = within(form).getByRole('textbox', { name: 'Tên hạng mục' });
    expect(name).toHaveValue('Đi lại');
    await userEvent.clear(name);
    await userEvent.type(name, 'Di chuyển');
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu hạng mục' }));
    await waitFor(() =>
      expect(engine.callsTo('spending.update_category')).toEqual([
        { id: 'category-transport', name: 'Di chuyển', icon: 'car', budgetVnd: 800_000 },
      ]),
    );
  });

  it('deletes a category without transactions after one confirmation', async () => {
    const { engine, dialog } = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xoá hạng mục Mua sắm' }));
    const confirm = await screen.findByRole('dialog', { name: 'Xoá hạng mục Mua sắm?' });
    expect(within(confirm).queryByRole('button', { name: /Chuyển sang hạng mục khác/ })).not.toBeInTheDocument();
    await userEvent.click(within(confirm).getByRole('button', { name: 'Xoá' }));
    await waitFor(() => expect(engine.callsTo('spending.delete_category')).toEqual([{ id: 'category-shopping' }]));
  });

  it('moves the transactions to another category of the same kind when asked', async () => {
    const { engine, dialog } = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xoá hạng mục Ăn uống' }));
    const confirm = await screen.findByRole('dialog', { name: 'Xoá hạng mục Ăn uống?' });
    expect(await within(confirm).findByRole('button', { name: /Chuyển sang hạng mục khác/, pressed: true })).toBeInTheDocument();
    await userEvent.click(within(confirm).getByRole('button', { name: 'Xoá' }));
    await waitFor(() => expect(engine.callsTo('spending.delete_category')).toHaveLength(1));
    expect(engine.callsTo('spending.delete_category')[0]).toMatchObject({ id: 'category-food', moveTransactionsTo: 'category-transport' });
  });

  it('deletes the transactions with the category when that is chosen', async () => {
    const { engine, dialog } = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xoá hạng mục Ăn uống' }));
    const confirm = await screen.findByRole('dialog', { name: 'Xoá hạng mục Ăn uống?' });
    await userEvent.click(await within(confirm).findByRole('button', { name: /Xoá luôn các giao dịch/ }));
    await userEvent.click(within(confirm).getByRole('button', { name: 'Xoá' }));
    await waitFor(() =>
      expect(engine.callsTo('spending.delete_category')).toEqual([{ id: 'category-food', deleteTransactions: true }]),
    );
  });
});
