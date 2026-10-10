import { EngineCallError } from '@alavo-daily/common/engine';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { createDemoData } from '../../testing/fixtures';
import { freezeToday, renderInSpendingShell, type SpendingRenderOptions } from '../../testing/renderSpending';
import { WalletsDialog } from './WalletsDialog';
import { WalletsSidebar } from './WalletsSidebar';

freezeToday();

function DialogHarness() {
  const [open, setOpen] = useState(true);
  return <WalletsDialog open={open} onOpenChange={setOpen} />;
}

async function openDialog(options: SpendingRenderOptions = {}) {
  const view = renderInSpendingShell(<DialogHarness />, options);
  const dialog = await screen.findByRole('dialog', { name: 'Quản lý ví' });
  await within(dialog).findByText(/Techcombank/);
  return { ...view, dialog };
}

describe('wallets in the sidebar', () => {
  it('lists every wallet with its balance, showing a negative balance with a minus sign', async () => {
    renderInSpendingShell(<WalletsSidebar />);
    expect(await screen.findByText('Techcombank')).toBeInTheDocument();
    expect(screen.getByText('54.708.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('190.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('−221.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('Ví')).toBeInTheDocument();
  });

  it('draws a sticker for each wallet kind', async () => {
    const { container } = renderInSpendingShell(<WalletsSidebar />);
    await screen.findByText('Techcombank');
    const stickers = [...container.querySelectorAll('img')].map((image) => image.dataset.sticker);
    expect(stickers).toEqual(['credit_card', 'mobile_phone', 'money_bag']);
  });

  it('shows skeletons while loading', () => {
    renderInSpendingShell(<WalletsSidebar />, {
      handlers: { 'spending.list_wallets': () => new Promise(() => undefined) },
    });
    expect(screen.getByRole('status', { name: 'Đang tải' })).toBeInTheDocument();
  });

  it('shows an error with retry when wallets cannot be loaded', async () => {
    renderInSpendingShell(<WalletsSidebar />, {
      handlers: {
        'spending.list_wallets': () => {
          throw new EngineCallError('internal', 'boom');
        },
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Có lỗi xảy ra');
  });

  it('opens the manage dialog from the sidebar button', async () => {
    renderInSpendingShell(<WalletsSidebar />);
    await userEvent.click(await screen.findByRole('button', { name: 'Quản lý ví' }));
    expect(await screen.findByRole('dialog', { name: 'Quản lý ví' })).toBeInTheDocument();
  });
});

describe('manage wallets dialog', () => {
  it('lists wallets with kind and balance', async () => {
    const { dialog } = await openDialog();
    expect(within(dialog).getByText('Ngân hàng · 54.708.000 ₫')).toBeInTheDocument();
    expect(within(dialog).getByText('Ví điện tử · 190.000 ₫')).toBeInTheDocument();
    expect(within(dialog).getByText('Tiền mặt · −221.000 ₫')).toBeInTheDocument();
  });

  it('creates a wallet with a kind and an opening balance', async () => {
    const { engine, dialog } = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thêm ví' }));
    const form = await screen.findByRole('dialog', { name: 'Thêm ví' });
    await userEvent.type(within(form).getByRole('textbox', { name: 'Tên ví' }), 'Timo');
    await userEvent.click(within(form).getByRole('radio', { name: 'Ví điện tử' }));
    await userEvent.type(within(form).getByRole('textbox', { name: 'Số dư ban đầu' }), '1500000');
    expect(within(form).getByRole('textbox', { name: 'Số dư ban đầu' })).toHaveValue('1.500.000');
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu ví' }));
    await waitFor(() => expect(engine.callsTo('spending.create_wallet')).toEqual([{ name: 'Timo', kind: 'ewallet', openingBalanceVnd: 1_500_000 }]));
    const list = await screen.findByRole('dialog', { name: 'Quản lý ví' });
    expect(await within(list).findByText('Timo')).toBeInTheDocument();
  });

  it('asks for a name before creating', async () => {
    const { engine, dialog } = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thêm ví' }));
    const form = await screen.findByRole('dialog', { name: 'Thêm ví' });
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu ví' }));
    expect(await within(form).findByText('Nhập tên ví.')).toBeInTheDocument();
    expect(engine.callsTo('spending.create_wallet')).toHaveLength(0);
  });

  it('renames a wallet and changes its opening balance', async () => {
    const { engine, dialog } = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sửa ví Ví MoMo' }));
    const form = await screen.findByRole('dialog', { name: 'Sửa ví' });
    expect(within(form).getByRole('textbox', { name: 'Tên ví' })).toHaveValue('Ví MoMo');
    expect(within(form).getByRole('textbox', { name: 'Số dư ban đầu' })).toHaveValue('500.000');
    const name = within(form).getByRole('textbox', { name: 'Tên ví' });
    await userEvent.clear(name);
    await userEvent.type(name, 'MoMo');
    const opening = within(form).getByRole('textbox', { name: 'Số dư ban đầu' });
    await userEvent.clear(opening);
    await userEvent.type(opening, '800000');
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu ví' }));
    await waitFor(() => expect(engine.callsTo('spending.update_wallet')).toEqual([{ id: 'wallet-momo', name: 'MoMo', kind: 'ewallet', openingBalanceVnd: 800_000 }]));
    expect(await within(await screen.findByRole('dialog', { name: 'Quản lý ví' })).findByText(/^Ví điện tử · 490\.000 ₫/)).toBeInTheDocument();
  });

  it('offers to move the transactions to another wallet when deleting a wallet that has some', async () => {
    const { engine, dialog } = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xoá ví Tiền mặt' }));
    const confirm = await screen.findByRole('dialog', { name: 'Xoá ví Tiền mặt?' });
    expect(within(confirm).getByRole('button', { name: /Chuyển sang ví khác/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(confirm).getByRole('button', { name: 'Xoá' }));
    await waitFor(() => expect(engine.callsTo('spending.delete_wallet')).toHaveLength(1));
    const [call] = engine.callsTo('spending.delete_wallet') as { id: string; moveTransactionsTo?: string }[];
    expect(call?.id).toBe('wallet-cash');
    expect(call?.moveTransactionsTo).toEqual(expect.any(String));
    expect(call?.moveTransactionsTo).not.toBe('wallet-cash');
  });

  it('deletes the transactions with the wallet when that is chosen', async () => {
    const { engine, dialog } = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xoá ví Tiền mặt' }));
    const confirm = await screen.findByRole('dialog', { name: 'Xoá ví Tiền mặt?' });
    await userEvent.click(within(confirm).getByRole('button', { name: /Xoá luôn các giao dịch/ }));
    await userEvent.click(within(confirm).getByRole('button', { name: 'Xoá' }));
    await waitFor(() =>
      expect(engine.callsTo('spending.delete_wallet')).toEqual([{ id: 'wallet-cash', deleteTransactions: true }]),
    );
  });

  it('deletes an empty wallet after confirmation without asking about transactions', async () => {
    const data = createDemoData();
    data.wallets.push({ id: 'wallet-empty', name: 'Ví trống', kind: 'cash', openingBalanceVnd: 0, balanceVnd: 0, position: 9 });
    const { dialog } = await openDialog({ data });
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Xoá ví Ví trống' }));
    const confirm = await screen.findByRole('dialog', { name: 'Xoá ví Ví trống?' });
    expect(within(confirm).queryByRole('button', { name: /Chuyển sang ví khác/ })).not.toBeInTheDocument();
    await userEvent.click(within(confirm).getByRole('button', { name: 'Xoá' }));
    await waitFor(() => expect(within(dialog).queryByText('Ví trống')).not.toBeInTheDocument());
  });

  it('keeps the wallet when the confirmation is cancelled', async () => {
    const { engine, dialog } = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xoá ví Ví MoMo' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Xoá ví Ví MoMo?' })).getByRole('button', { name: 'Huỷ' }));
    expect(engine.callsTo('spending.delete_wallet')).toHaveLength(0);
  });

  it('shows an empty state when there are no wallets', async () => {
    const data = createDemoData();
    data.wallets = [];
    renderInSpendingShell(<DialogHarness />, { data });
    expect(await screen.findByText('Chưa có ví nào')).toBeInTheDocument();
  });
});
