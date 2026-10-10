import type { Estimate } from '@alavo-daily/common/engine';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createDemoData, type FakeData } from '../../testing/fixtures';
import { freezeToday, renderSpending, type SpendingRenderOptions } from '../../testing/renderSpending';

freezeToday();

function wedding(overrides: Partial<Estimate> = {}): Estimate {
  return {
    id: 'estimate-1',
    name: 'Đám cưới',
    icon: 'gift',
    contingencyPercent: 10,
    walletIds: ['wallet-tcb'],
    factors: [{ id: 'f-guests', label: 'khách', value: 200 }],
    items: [
      { id: 'i-party', group: 'Tiệc', name: 'Tiệc nhà hàng', price: 450_000, quantity: 1, priority: 'must', by: ['f-guests'], paid: 40_000_000 },
      { id: 'i-video', group: 'Hình ảnh', name: 'Quay phóng sự', price: 10_000_000, quantity: 1, priority: 'nice', by: [], paid: 0 },
    ],
    income: [{ id: 'in-1', label: 'Tiền mừng', amount: 70_000_000 }],
    ...overrides,
  };
}

const SHORT_OF_MONEY = [{ id: 'in-1', label: 'Tiền mừng', amount: 5_000_000 }];

function dataWith(estimates: Estimate[]): FakeData {
  return { ...createDemoData(), estimates };
}

function openList(options: SpendingRenderOptions = {}) {
  return renderSpending({ route: '/spending/estimates', ...options });
}

function openDetail(options: SpendingRenderOptions = {}) {
  return renderSpending({ route: '/spending/estimates/estimate-1', data: dataWith([wedding()]), ...options });
}

describe('list of estimates', () => {
  it('explains what an estimate is and offers the templates when there is none', async () => {
    openList();
    expect(await screen.findByText('Chưa có dự toán nào')).toBeInTheDocument();
    expect(screen.getByText(/trả lời một câu: tiền đã đủ chưa/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Du lịch' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tự đặt' })).toBeInTheDocument();
  });

  it('starts an estimate from a template with the numbers it suggests', async () => {
    const { engine } = openList();
    await userEvent.click(await screen.findByRole('button', { name: 'Du lịch' }));
    const form = await screen.findByRole('dialog', { name: 'Dự toán mới' });
    expect(within(form).getByRole('textbox', { name: 'Tên dự toán' })).toHaveValue('Du lịch');
    await userEvent.click(within(form).getByRole('button', { name: 'Tạo dự toán' }));
    await waitFor(() => expect(engine.callsTo('spending.create_estimate')).toHaveLength(1));
    const [call] = engine.callsTo('spending.create_estimate') as { name: string; icon: string; factors: { label: string }[]; contingencyPercent: number }[];
    expect(call).toMatchObject({ name: 'Du lịch', icon: 'airplane-tilt', contingencyPercent: 10 });
    expect(call?.factors.map((factor) => factor.label)).toEqual(['người', 'ngày', 'đêm']);
  });

  it('asks for a name before creating', async () => {
    const { engine } = openList();
    await userEvent.click(await screen.findByRole('button', { name: 'Dự toán mới' }));
    const form = await screen.findByRole('dialog', { name: 'Dự toán mới' });
    await userEvent.click(within(form).getByRole('button', { name: 'Tạo dự toán' }));
    expect(await within(form).findByText('Nhập tên dự toán.')).toBeInTheDocument();
    expect(engine.callsTo('spending.create_estimate')).toHaveLength(0);
  });

  it('shows each estimate with how much of it is covered and whether the money is enough', async () => {
    openList({ data: dataWith([wedding({ income: SHORT_OF_MONEY })]) });
    const card = await screen.findByRole('link', { name: /Đám cưới/ });
    expect(within(card).getByText(/^2 khoản · 110\.000\.000/)).toBeInTheDocument();
    expect(within(card).getByText('Còn thiếu')).toBeInTheDocument();
    expect(within(card).getByRole('progressbar', { name: 'Phần đã đủ tiền' })).toBeInTheDocument();
  });
});

describe('one estimate', () => {
  it('answers whether the money is enough with the sum written out', async () => {
    openDetail();
    const sum = await screen.findByRole('group', { name: 'Tiền đang có cộng khoản thu dự kiến trừ còn phải chi' });
    expect(within(sum).getByText('Đang có')).toBeInTheDocument();
    expect(within(sum).getByText('10 tr')).toBeInTheDocument();
    expect(within(sum).getAllByText('70 tr')).toHaveLength(2);
    expect(within(sum).getByText('Cần chi')).toBeInTheDocument();
    expect(screen.getByText('Đủ tiền, còn dư')).toBeInTheDocument();
  });

  it('always shows the result without the expected income, which is the number people guess too high', async () => {
    openDetail();
    expect(await screen.findByText(/Nếu chưa tính khoản thu dự kiến: còn thiếu/)).toBeInTheDocument();
  });

  it('shows what dropping the less important items would do, and offers a goal for the shortfall', async () => {
    renderSpending({ route: '/spending/estimates/estimate-1', data: dataWith([wedding({ income: SHORT_OF_MONEY })]) });
    const tips = await screen.findByText('Cách để đủ tiền');
    const card = tips.parentElement as HTMLElement;
    expect(within(card).getByText('Bỏ các khoản "Có thì tốt"')).toBeInTheDocument();
    expect(within(card).getByText('Bỏ thêm các khoản "Nên có"')).toBeInTheDocument();
    await userEvent.click(within(card).getByRole('button', { name: 'Đặt mục tiêu tiết kiệm cho phần thiếu' }));
    const goal = await screen.findByRole('dialog', { name: 'Mục tiêu mới' });
    expect(within(goal).getByRole('textbox', { name: 'Tên mục tiêu' })).toHaveValue('Đám cưới');
  });

  it('shows no tips once the money is enough', async () => {
    const rich = wedding({ income: [{ id: 'in-1', label: 'Tiền mừng', amount: 900_000_000 }] });
    renderSpending({ route: '/spending/estimates/estimate-1', data: dataWith([rich]) });
    expect(await screen.findByText('Đủ tiền, còn dư')).toBeInTheDocument();
    expect(screen.queryByText('Cách để đủ tiền')).not.toBeInTheDocument();
  });

  it('shows each item with what it multiplies by and what was paid as a deposit', async () => {
    openDetail();
    expect(await screen.findByText('450.000 ₫ × 200 khách · Cần có')).toBeInTheDocument();
    expect(screen.getByText('Đã cọc 40.000.000 ₫, còn 50.000.000 ₫')).toBeInTheDocument();
  });

  it('changes the numbers when a factor changes', async () => {
    const { engine } = openDetail();
    await userEvent.click(await screen.findByRole('button', { name: /Các con số nhân/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Các con số nhân' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tăng khách' }));
    await waitFor(() =>
      expect(engine.callsTo('spending.save_estimate_factor')).toEqual([
        { estimateId: 'estimate-1', id: 'f-guests', label: 'khách', value: 201 },
      ]),
    );
  });

  it('changes the contingency among the offered percents', async () => {
    const { engine } = openDetail();
    await userEvent.click(await screen.findByRole('button', { name: /Dự phòng phát sinh 10%/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Dự phòng phát sinh' });
    await userEvent.click(within(dialog).getByRole('radio', { name: '15%' }));
    await waitFor(() => expect(engine.callsTo('spending.update_estimate')).toEqual([{ id: 'estimate-1', contingencyPercent: 15 }]));
  });

  it('chooses which wallets count as money on hand', async () => {
    const { engine } = openDetail();
    await userEvent.click(await screen.findByRole('button', { name: /Đang có/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Tiền đang có' });
    await userEvent.click(await within(dialog).findByRole('checkbox', { name: 'Tính ví Ví MoMo' }));
    await waitFor(() =>
      expect(engine.callsTo('spending.update_estimate')).toEqual([{ id: 'estimate-1', walletIds: ['wallet-tcb', 'wallet-momo'] }]),
    );
  });

  it('adds and removes expected income', async () => {
    const { engine } = openDetail();
    await userEvent.click(await screen.findByRole('button', { name: /Sẽ thu/ }));
    const list = await screen.findByRole('dialog', { name: 'Khoản sẽ thu' });
    await userEvent.click(within(list).getByRole('button', { name: 'Xoá khoản thu Tiền mừng' }));
    await waitFor(() => expect(engine.callsTo('spending.delete_estimate_income')).toEqual([{ estimateId: 'estimate-1', id: 'in-1' }]));
  });
});

describe('items and payments', () => {
  it('adds an item to a group with its price, quantity, importance and factor', async () => {
    const { engine } = openDetail();
    await userEvent.click(await screen.findByRole('button', { name: 'Thêm khoản cần mua' }));
    const form = await screen.findByRole('dialog', { name: 'Thêm khoản cần mua' });
    await userEvent.type(within(form).getByRole('textbox', { name: 'Tên khoản' }), 'Rượu');
    await userEvent.type(within(form).getByRole('textbox', { name: 'Đơn giá' }), '40000');
    await userEvent.click(within(form).getByRole('radio', { name: 'Nên có' }));
    await userEvent.click(within(form).getByRole('checkbox', { name: /khách/ }));
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu khoản' }));
    await waitFor(() => expect(engine.callsTo('spending.save_estimate_item')).toHaveLength(1));
    expect(engine.callsTo('spending.save_estimate_item')[0]).toMatchObject({
      estimateId: 'estimate-1', name: 'Rượu', price: 40_000, priority: 'should', by: ['f-guests'], quantity: 1,
    });
  });

  it('asks for a name before saving an item', async () => {
    const { engine } = openDetail();
    await userEvent.click(await screen.findByRole('button', { name: 'Thêm khoản cần mua' }));
    const form = await screen.findByRole('dialog', { name: 'Thêm khoản cần mua' });
    await userEvent.click(within(form).getByRole('button', { name: 'Lưu khoản' }));
    expect(await within(form).findByText('Nhập tên khoản.')).toBeInTheDocument();
    expect(engine.callsTo('spending.save_estimate_item')).toHaveLength(0);
  });

  it('records a payment into spending by default, in the category and wallet chosen', async () => {
    const { engine } = openDetail();
    await userEvent.click(await screen.findByRole('button', { name: 'Ghi tiền đã trả: Quay phóng sự' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tiền đã trả cho Quay phóng sự' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Số tiền đã trả' }), '3000000');
    expect(within(dialog).getByRole('button', { name: /Ghi vào Chi tiêu/, pressed: true })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(engine.callsTo('spending.set_estimate_item_paid')).toHaveLength(1));
    expect(engine.callsTo('spending.set_estimate_item_paid')[0]).toMatchObject({
      id: 'i-video', paid: 3_000_000, record: { categoryId: 'category-food', walletId: 'wallet-tcb', occurredOn: '2026-10-09' },
    });
  });

  it('only updates the estimate when the person already recorded the payment', async () => {
    const { engine } = openDetail();
    await userEvent.click(await screen.findByRole('button', { name: 'Ghi tiền đã trả: Quay phóng sự' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tiền đã trả cho Quay phóng sự' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Số tiền đã trả' }), '3000000');
    await userEvent.click(within(dialog).getByRole('button', { name: /Chỉ cập nhật dự toán/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(engine.callsTo('spending.set_estimate_item_paid')).toEqual([{ id: 'i-video', paid: 3_000_000, record: undefined }]));
  });

  it('marks an item as paid in full with one press', async () => {
    const { engine } = openDetail();
    await userEvent.click(await screen.findByRole('button', { name: 'Ghi tiền đã trả: Quay phóng sự' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tiền đã trả cho Quay phóng sự' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Trả đủ' }));
    expect(within(dialog).getByRole('textbox', { name: 'Số tiền đã trả' })).toHaveValue('10.000.000');
    await userEvent.click(within(dialog).getByRole('button', { name: /Chỉ cập nhật dự toán/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(engine.callsTo('spending.set_estimate_item_paid')[0]).toMatchObject({ paid: 10_000_000 }));
  });

  it('deletes the estimate after confirmation and goes back to the list', async () => {
    const { engine } = openDetail();
    await userEvent.click(await screen.findByRole('button', { name: 'Xoá dự toán' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Xoá dự toán Đám cưới?' });
    expect(confirm).toHaveTextContent('vẫn được giữ');
    await userEvent.click(within(confirm).getByRole('button', { name: 'Xoá' }));
    await waitFor(() => expect(engine.callsTo('spending.delete_estimate')).toEqual([{ id: 'estimate-1' }]));
    expect(await screen.findByLabelText('Địa chỉ hiện tại')).toHaveTextContent('/spending/estimates');
  });
});
