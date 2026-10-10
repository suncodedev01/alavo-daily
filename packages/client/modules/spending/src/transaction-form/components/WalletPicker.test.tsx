import type { Wallet } from '@alavo-daily/common/engine';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createDemoData, type FakeData } from '../../testing/fixtures';
import { freezeToday, NARROW_WIDTH, renderInSpendingShell, type SpendingRenderOptions } from '../../testing/renderSpending';
import { TransactionDialog } from './TransactionDialog';

freezeToday();

function extraWallet(index: number): Wallet {
  return {
    id: `wallet-extra-${index}`,
    name: `Thẻ ${index}`,
    kind: 'bank',
    openingBalanceVnd: 0,
    balanceVnd: 0,
    position: 10 + index,
  };
}

function dataWithWalletCount(count: number): FakeData {
  const data = createDemoData();
  const missing = Math.max(0, count - data.wallets.length);
  const extras = Array.from({ length: missing }, (_, index) => extraWallet(index + 1));
  data.wallets = [...data.wallets, ...extras].slice(0, count);
  return data;
}

function openDialog(options: SpendingRenderOptions & { editingId?: string } = {}) {
  const data = options.data ?? createDemoData();
  const editing = data.transactions.find((item) => item.id === options.editingId) ?? null;
  return renderInSpendingShell(<TransactionDialog open onOpenChange={() => undefined} editing={editing} />, {
    ...options,
    data,
  });
}

const paymentGroup = () => screen.findByRole('group', { name: 'Chi từ ví' });

async function typeAmount(text: string) {
  await userEvent.type(await screen.findByRole('textbox', { name: 'Số tiền' }), text);
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Lưu giao dịch' }));

describe('wallet pills', () => {
  it('shows every wallet as a pill under "Chi từ ví" and selects the first one', async () => {
    openDialog();
    const group = await paymentGroup();
    const names = within(group).getAllByRole('button').map((button) => button.textContent);
    expect(names).toEqual(['Techcombank', 'Ví MoMo', 'Tiền mặt']);
    expect(within(group).getByRole('button', { name: 'Techcombank', pressed: true })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'Ví MoMo', pressed: false })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Chi từ ví:/ })).not.toBeInTheDocument();
  });

  it('saves the wallet of the pill the person picked', async () => {
    const { engine } = openDialog();
    await typeAmount('1000');
    await userEvent.click(within(await paymentGroup()).getByRole('button', { name: 'Tiền mặt' }));
    expect(within(await paymentGroup()).getByRole('button', { name: 'Tiền mặt', pressed: true })).toBeInTheDocument();
    await save();
    await waitFor(() => expect(engine.callsTo('spending.record_transaction')).toHaveLength(1));
    expect(engine.callsTo('spending.record_transaction')[0]).toMatchObject({ walletId: 'wallet-cash' });
  });

  it('keeps the stored wallet when editing a transaction', async () => {
    const data = createDemoData();
    const grab = data.transactions.find((item) => item.title === 'Grab đi làm')!;
    const { engine } = openDialog({ data, editingId: grab.id });
    const group = await paymentGroup();
    expect(within(group).getByRole('button', { name: 'Ví MoMo', pressed: true })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(engine.callsTo('spending.update_transaction')).toHaveLength(1));
    expect(engine.callsTo('spending.update_transaction')[0]).toMatchObject({ id: grab.id, walletId: 'wallet-momo' });
  });

  it('wraps the pills and keeps them tall enough to tap on a phone', async () => {
    openDialog({ width: NARROW_WIDTH, data: dataWithWalletCount(4) });
    const group = await paymentGroup();
    expect(group).toHaveClass('flex-wrap');
    const pills = within(group).getAllByRole('button');
    expect(pills).toHaveLength(4);
    pills.forEach((pill) => expect(pill).toHaveClass('min-h-11'));
  });

  it('gives each kind of wallet its own icon', async () => {
    openDialog();
    const group = await paymentGroup();
    const iconOf = (name: string) => within(group).getByRole('button', { name }).querySelector('svg');
    const markup = ['Techcombank', 'Ví MoMo', 'Tiền mặt'].map((name) => iconOf(name)?.innerHTML);
    expect(new Set(markup).size).toBe(3);
  });
});

describe('payment method picker with many wallets', () => {
  it('falls back to a picker once there are more than four wallets', async () => {
    const { engine } = openDialog({ data: dataWithWalletCount(5) });
    await userEvent.click(await screen.findByRole('button', { name: /^Chi từ ví: Techcombank/ }));
    expect(screen.queryByRole('group', { name: 'Chi từ ví' })).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('menuitemradio', { name: /Thẻ 2/ }));
    await typeAmount('1000');
    await save();
    await waitFor(() => expect(engine.callsTo('spending.record_transaction')).toHaveLength(1));
    expect(engine.callsTo('spending.record_transaction')[0]).toMatchObject({ walletId: 'wallet-extra-2' });
  });

  it('still shows pills at exactly four wallets', async () => {
    openDialog({ data: dataWithWalletCount(4) });
    expect(await paymentGroup()).toBeInTheDocument();
  });
});

describe('wallet wording', () => {
  it('uses the English words for the label and the built-in wallet names', async () => {
    const data = createDemoData();
    data.wallets = [
      { ...extraWallet(1), id: 'wallet-cash', name: 'Tiền mặt', kind: 'cash' },
      { ...extraWallet(2), id: 'wallet-bank', name: 'Chuyển khoản', kind: 'bank' },
      { ...extraWallet(3), id: 'wallet-ewallet', name: 'Ví điện tử', kind: 'ewallet' },
    ];
    openDialog({ data, language: 'en' });
    const group = await screen.findByRole('group', { name: 'Spend from' });
    const names = within(group).getAllByRole('button').map((button) => button.textContent);
    expect(names).toEqual(['Cash', 'Bank transfer', 'E-wallet']);
  });

  it('asks the person to choose how they paid when there is no wallet', async () => {
    const data = createDemoData();
    data.wallets = [];
    const { engine } = openDialog({ data });
    await typeAmount('5000');
    await save();
    expect(await screen.findByText('Hãy chọn ví.')).toBeInTheDocument();
    expect(engine.callsTo('spending.record_transaction')).toHaveLength(0);
  });
});
