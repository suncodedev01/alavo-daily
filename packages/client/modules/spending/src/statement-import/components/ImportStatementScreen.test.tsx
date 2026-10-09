import { EngineCallError, type StatementPreview } from '@alavo-daily/common/engine';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createDemoData } from '../../testing/fixtures';
import { freezeToday, NARROW_WIDTH, renderSpending, type SpendingRenderOptions } from '../../testing/renderSpending';

freezeToday();

const VIETNAMESE_BANK_TEXT = `Ngày giao dịch;Số tiền ghi nợ;Số tiền ghi có;Số dư;Nội dung
01/10/2026;;28.000.000;38.000.000;CONG TY ABC TRA LUONG T10
02/10/2026;650.000;;37.350.000;THANH TOAN EVN HCMC TIEN DIEN T9
03/10/2026;65.000;;37.285.000;GRAB*TRIP HCM
Tổng cộng;715.000;28.000.000;;`;

const VIETNAMESE_BANK: StatementPreview = {
  delimiter: ';',
  rows: [
    { line: 2, occurredOn: '2026-10-01', amountVnd: 28_000_000, title: 'CONG TY ABC TRA LUONG T10', categoryId: 'category-income', problems: [] },
    { line: 3, occurredOn: '2026-10-02', amountVnd: -650_000, title: 'THANH TOAN EVN HCMC TIEN DIEN T9', categoryId: 'category-bills', problems: [] },
    { line: 4, occurredOn: '2026-10-03', amountVnd: -65_000, title: 'GRAB*TRIP HCM', categoryId: 'category-transport', problems: [] },
    { line: 5, occurredOn: null, amountVnd: 27_285_000, title: 'Giao dịch ngân hàng', categoryId: 'category-income', problems: ['invalid_date'] },
  ],
};

const ENGLISH_BANK_TEXT = `Date,Description,Debit,Credit,Balance
09/10/2026,"SHOPEE*ORDER 8812, HCM","1,250,000",,"9,935,000"
08/10/2026,Transfer from Lan,,"500,000","11,185,000"`;

const ENGLISH_BANK: StatementPreview = {
  delimiter: ',',
  rows: [
    { line: 2, occurredOn: '2026-10-09', amountVnd: -1_250_000, title: 'SHOPEE*ORDER 8812, HCM', categoryId: 'category-shopping', problems: [] },
    { line: 3, occurredOn: '2026-10-08', amountVnd: 500_000, title: 'Transfer from Lan', categoryId: 'category-income', problems: [] },
  ],
};

function previewHandler(preview: StatementPreview) {
  return { 'spending.import_preview': () => preview };
}

async function openWith(text: string, preview: StatementPreview, options: SpendingRenderOptions = {}) {
  const view = renderSpending({ route: '/spending/import', handlers: previewHandler(preview), ...options });
  const box = await screen.findByRole('textbox', { name: 'Nội dung sao kê' });
  await userEvent.click(box);
  await userEvent.paste(text);
  await userEvent.click(screen.getByRole('button', { name: 'Đọc sao kê' }));
  await screen.findByRole('list', { name: 'Các dòng trong sao kê' });
  return view;
}

const rowCheckbox = (line: number) => screen.getByRole('checkbox', { name: `Nhập dòng ${line}` });

describe('reaching the import', () => {
  it('opens from the Nhập sao kê button in the transactions header', async () => {
    renderSpending({ route: '/spending/transactions' });
    await userEvent.click(await screen.findByRole('link', { name: 'Nhập sao kê' }));
    expect(await screen.findByRole('heading', { name: 'Chọn sao kê ngân hàng' })).toBeInTheDocument();
    expect(screen.getByLabelText('Địa chỉ hiện tại', { selector: 'output' })).toHaveTextContent('/spending/import');
  });

  it('is an icon button with the same name on a narrow screen', async () => {
    renderSpending({ route: '/spending/transactions', width: NARROW_WIDTH });
    expect(await screen.findByRole('link', { name: 'Nhập sao kê' })).toBeInTheDocument();
  });

  it('goes back to the transactions with the link at the top', async () => {
    renderSpending({ route: '/spending/import' });
    await userEvent.click(await screen.findByRole('link', { name: 'Giao dịch' }));
    expect(screen.getByLabelText('Địa chỉ hiện tại', { selector: 'output' })).toHaveTextContent('/spending/transactions');
  });
});

describe('choosing the statement', () => {
  it('only offers to read it once there is text', async () => {
    renderSpending({ route: '/spending/import' });
    const read = await screen.findByRole('button', { name: 'Đọc sao kê' });
    expect(read).toBeDisabled();
    await userEvent.type(screen.getByRole('textbox', { name: 'Nội dung sao kê' }), 'a');
    expect(read).toBeEnabled();
  });

  it('fills the text box from a chosen file through a button and a hidden file input', async () => {
    renderSpending({ route: '/spending/import' });
    const input = await screen.findByLabelText('File sao kê', { selector: 'input' });
    expect(input).not.toBeVisible();
    await userEvent.upload(input, new File([ENGLISH_BANK_TEXT], 'techcombank.csv', { type: 'text/csv' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Nội dung sao kê' })).toHaveValue(ENGLISH_BANK_TEXT));
    expect(screen.getByText('techcombank.csv')).toBeInTheDocument();
  });

  it('tells the person when the chosen file cannot be read', async () => {
    class FailingReader {
      error = new Error('unreadable');
      onerror: (() => void) | null = null;
      readAsArrayBuffer(): void {
        this.onerror?.();
      }
    }
    renderSpending({ route: '/spending/import' });
    const input = await screen.findByLabelText('File sao kê', { selector: 'input' });
    vi.stubGlobal('FileReader', FailingReader);
    await userEvent.upload(input, new File(['x'], 'hong.csv'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không đọc được file này');
    vi.unstubAllGlobals();
  });

  it('sends the text to the engine and shows the lines it found', async () => {
    const { engine } = await openWith(VIETNAMESE_BANK_TEXT, VIETNAMESE_BANK);
    expect(engine.callsTo('spending.import_preview')).toEqual([{ csv: VIETNAMESE_BANK_TEXT }]);
    const rows = within(screen.getByRole('list', { name: 'Các dòng trong sao kê' })).getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent('THANH TOAN EVN HCMC TIEN DIEN T9');
    expect(rows[1]).toHaveTextContent('2/10/2026');
    expect(rows[1]).toHaveTextContent('−650.000 ₫');
    expect(rows[0]).toHaveTextContent('+28.000.000 ₫');
  });

  it('explains a text that is not a statement', async () => {
    renderSpending({
      route: '/spending/import',
      handlers: {
        'spending.import_preview': () => {
          throw new EngineCallError('validation', 'the statement has no recognisable date and amount columns');
        },
      },
    });
    await userEvent.type(await screen.findByRole('textbox', { name: 'Nội dung sao kê' }), 'xin chào');
    await userEvent.click(screen.getByRole('button', { name: 'Đọc sao kê' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không nhận ra cột ngày và số tiền');
  });
});

describe('reviewing the lines', () => {
  it('selects the readable lines and leaves out the one with a problem', async () => {
    await openWith(VIETNAMESE_BANK_TEXT, VIETNAMESE_BANK);
    expect([2, 3, 4].map((line) => rowCheckbox(line).getAttribute('aria-checked'))).toEqual(['true', 'true', 'true']);
    expect(rowCheckbox(5)).toHaveAttribute('aria-checked', 'false');
    expect(rowCheckbox(5)).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Không đọc được ngày')).toBeInTheDocument();
    expect(screen.getByText(/Đã chọn 3\/4 dòng · 1 dòng không đọc được/)).toBeInTheDocument();
  });

  it('shows the suggested category of each line and lets the person change it', async () => {
    const { engine } = await openWith(VIETNAMESE_BANK_TEXT, VIETNAMESE_BANK);
    expect(screen.getByRole('button', { name: 'Hạng mục dòng 3: Hoá đơn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hạng mục dòng 2: Thu nhập' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hạng mục dòng 4: Đi lại' }));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: /Mua sắm/ }));
    expect(screen.getByRole('button', { name: 'Hạng mục dòng 4: Mua sắm' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Nhập \d+ giao dịch$/ }));
    await waitFor(() => expect(engine.callsTo('spending.import_transactions')).toHaveLength(1));
    const sent = engine.callsTo('spending.import_transactions')[0] as { rows: { categoryId: string; title: string }[] };
    expect(sent.rows.find((row) => row.title === 'GRAB*TRIP HCM')?.categoryId).toBe('category-shopping');
  });

  it('offers only categories that fit money in or money out', async () => {
    await openWith(VIETNAMESE_BANK_TEXT, VIETNAMESE_BANK);
    await userEvent.click(screen.getByRole('button', { name: 'Hạng mục dòng 2: Thu nhập' }));
    expect(await screen.findByRole('menuitemradio', { name: /Thu nhập/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitemradio', { name: /Ăn uống/ })).not.toBeInTheDocument();
  });

  it('counts the selected lines in the confirm button and the summary', async () => {
    await openWith(VIETNAMESE_BANK_TEXT, VIETNAMESE_BANK);
    expect(screen.getByRole('button', { name: 'Nhập 3 giao dịch' })).toBeEnabled();
    await userEvent.click(rowCheckbox(4));
    expect(screen.getByRole('button', { name: 'Nhập 2 giao dịch' })).toBeInTheDocument();
    expect(screen.getByText(/Đã chọn 2\/4 dòng/)).toBeInTheDocument();
  });

  it('clears and selects every readable line with "Chọn tất cả"', async () => {
    await openWith(VIETNAMESE_BANK_TEXT, VIETNAMESE_BANK);
    const all = screen.getByRole('checkbox', { name: 'Chọn tất cả' });
    expect(all).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(all);
    expect([2, 3, 4, 5].map((line) => rowCheckbox(line).getAttribute('aria-checked'))).toEqual(['false', 'false', 'false', 'false']);
    expect(screen.getByRole('button', { name: 'Nhập 0 giao dịch' })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Chọn tất cả' }));
    expect(rowCheckbox(2)).toHaveAttribute('aria-checked', 'true');
    expect(rowCheckbox(5)).toHaveAttribute('aria-checked', 'false');
  });

  it('goes back to the text with the text still there', async () => {
    await openWith(VIETNAMESE_BANK_TEXT, VIETNAMESE_BANK);
    await userEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
    expect(await screen.findByRole('textbox', { name: 'Nội dung sao kê' })).toHaveValue(VIETNAMESE_BANK_TEXT);
  });

  it('says so when the statement has no lines', async () => {
    renderSpending({ route: '/spending/import', handlers: previewHandler({ delimiter: ';', rows: [] }) });
    await userEvent.type(await screen.findByRole('textbox', { name: 'Nội dung sao kê' }), 'Date;Amount;Description');
    await userEvent.click(screen.getByRole('button', { name: 'Đọc sao kê' }));
    expect(await screen.findByText('Không có dòng giao dịch nào')).toBeInTheDocument();
  });
});

describe('confirming', () => {
  it('records the chosen lines in the first wallet and goes to the list with a result message', async () => {
    const { engine } = await openWith(VIETNAMESE_BANK_TEXT, VIETNAMESE_BANK);
    await userEvent.click(rowCheckbox(4));
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 2 giao dịch' }));
    await waitFor(() => expect(engine.callsTo('spending.import_transactions')).toHaveLength(1));
    expect(engine.callsTo('spending.import_transactions')[0]).toEqual({
      walletId: 'wallet-tcb',
      rows: [
        { occurredOn: '2026-10-01', amountVnd: 28_000_000, title: 'CONG TY ABC TRA LUONG T10', categoryId: 'category-income' },
        { occurredOn: '2026-10-02', amountVnd: -650_000, title: 'THANH TOAN EVN HCMC TIEN DIEN T9', categoryId: 'category-bills' },
      ],
    });
    expect(await screen.findByText('Đã nhập 2 giao dịch')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText('Địa chỉ hiện tại', { selector: 'output' })).toHaveTextContent('/spending/transactions'),
    );
  });

  it('uses the wallet the person picks', async () => {
    const { engine } = await openWith(ENGLISH_BANK_TEXT, ENGLISH_BANK);
    await userEvent.click(screen.getByRole('button', { name: /^Ví nhận giao dịch: / }));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: /Tiền mặt/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 2 giao dịch' }));
    await waitFor(() => expect(engine.callsTo('spending.import_transactions')).toHaveLength(1));
    expect(engine.callsTo('spending.import_transactions')[0]).toMatchObject({ walletId: 'wallet-cash' });
  });

  it('shows the new transactions in the list after importing', async () => {
    const data = createDemoData();
    await openWith(ENGLISH_BANK_TEXT, ENGLISH_BANK, { data });
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 2 giao dịch' }));
    const pane = await screen.findByRole('navigation', { name: 'Ngăn danh sách' });
    expect(await within(pane).findByRole('link', { name: /SHOPEE\*ORDER 8812, HCM/ })).toHaveTextContent('−1.250.000 ₫');
    expect(within(pane).getByRole('link', { name: /Transfer from Lan/ })).toHaveTextContent('+500.000 ₫');
  });

  it('reports lines skipped as duplicates', async () => {
    const data = createDemoData();
    const known = { occurredOn: '2026-10-09', amountVnd: -1_250_000, title: 'SHOPEE*ORDER 8812, HCM' };
    data.transactions.push({ ...data.transactions[0]!, ...known, id: 'existing', walletId: 'wallet-tcb', categoryId: 'category-shopping' });
    await openWith(ENGLISH_BANK_TEXT, ENGLISH_BANK, { data });
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 2 giao dịch' }));
    expect(await screen.findByText('Đã nhập 1 giao dịch, bỏ qua 1 giao dịch đã có')).toBeInTheDocument();
  });

  it('keeps the review open with a message when the engine refuses the lines', async () => {
    await openWith(ENGLISH_BANK_TEXT, ENGLISH_BANK, {
      handlers: {
        ...previewHandler(ENGLISH_BANK),
        'spending.import_transactions': () => {
          throw new EngineCallError('validation', 'category category-gone does not exist');
        },
      },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Nhập 2 giao dịch' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Hạng mục hoặc ví đã chọn không còn tồn tại.');
    expect(screen.getByRole('list', { name: 'Các dòng trong sao kê' })).toBeInTheDocument();
  });
});
