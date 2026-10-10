import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createDemoData } from '../../testing/fixtures';
import { freezeToday, renderInSpendingShell, type SpendingRenderOptions } from '../../testing/renderSpending';
import { BankAccountsDialog } from './BankAccountsDialog';

freezeToday();

function open(options: SpendingRenderOptions = {}) {
  return renderInSpendingShell(<BankAccountsDialog open onOpenChange={() => undefined} />, options);
}

describe('bank account numbers', () => {
  it('lists only the wallets that have an account number, with the whole number', async () => {
    const data = createDemoData();
    data.wallets[0] = { ...data.wallets[0]!, accountNumber: '190345678901' };
    open({ data });
    const dialog = await screen.findByRole('dialog', { name: 'Số tài khoản ngân hàng' });
    expect(await within(dialog).findByText('190345678901')).toBeInTheDocument();
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(1);
  });

  it('copies the number of the wallet that was pressed', async () => {
    const user = userEvent.setup();
    const data = createDemoData();
    data.wallets[0] = { ...data.wallets[0]!, accountNumber: '190345678901' };
    open({ data });
    await user.click(await screen.findByRole('button', { name: 'Sao chép số tài khoản Techcombank' }));
    expect(await navigator.clipboard.readText()).toBe('190345678901');
    expect(await screen.findByText('Đã sao chép số tài khoản')).toBeInTheDocument();
  });

  it('explains how to add a number when none has been saved', async () => {
    open();
    expect(await screen.findByText('Chưa có số tài khoản nào')).toBeInTheDocument();
  });
});
