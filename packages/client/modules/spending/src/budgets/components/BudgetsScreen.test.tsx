import { EngineCallError } from '@alavo-daily/common/engine';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createDemoData } from '../../testing/fixtures';
import { freezeToday, NARROW_WIDTH, renderSpending, type SpendingRenderOptions } from '../../testing/renderSpending';

freezeToday();

const location = () => screen.getByLabelText('Địa chỉ hiện tại', { selector: 'output' });

async function openBudgets(options: SpendingRenderOptions = {}) {
  const view = renderSpending({ route: '/spending/budgets', ...options });
  await screen.findByRole('region', { name: 'Tổng quan ngân sách' });
  return view;
}

async function openMenu(categoryName: string, itemName: string) {
  await userEvent.click(screen.getByRole('button', { name: `Tuỳ chọn ${categoryName}` }));
  await userEvent.click(await screen.findByRole('menuitem', { name: itemName }));
}

describe('Budgets data', () => {
  it('shows the money left, the daily allowance and total progress', async () => {
    await openBudgets();
    const hero = screen.getByRole('region', { name: 'Tổng quan ngân sách' });
    expect(within(hero).getByText('Còn lại tháng này')).toBeInTheDocument();
    expect(within(hero).getByText('1.977.000 ₫')).toBeInTheDocument();
    expect(within(hero).getByText('Khoảng 89.864 ₫ mỗi ngày trong 22 ngày tới')).toBeInTheDocument();
    expect(within(hero).getByText('Đã chi 2.623.000 ₫')).toBeInTheDocument();
    expect(within(hero).getByText('/ 4.600.000 ₫')).toBeInTheDocument();
  });

  it('shows a card per budgeted category with meter, percentage and what is left', async () => {
    await openBudgets();
    const food = screen.getByRole('region', { name: 'Ăn uống' });
    expect(within(food).getByText('2.345.000 ₫ / 2.600.000 ₫')).toBeInTheDocument();
    expect(within(food).getByText('90%')).toBeInTheDocument();
    expect(within(food).getByText('Còn 255.000 ₫')).toBeInTheDocument();
    expect(within(food).getByRole('progressbar', { name: 'Đã dùng ngân sách Ăn uống' })).toHaveAttribute('data-tone', 'warn');
    const transport = screen.getByRole('region', { name: 'Đi lại' });
    expect(within(transport).getByRole('progressbar')).toHaveAttribute('data-tone', 'normal');
    expect(screen.queryByRole('region', { name: 'Mua sắm' })).not.toBeInTheDocument();
  });

  it('shows overspending with the red tone and the amount over', async () => {
    const data = createDemoData();
    data.categories.find((item) => item.id === 'category-food')!.budgetVnd = 2_000_000;
    await openBudgets({ data });
    const food = screen.getByRole('region', { name: 'Ăn uống' });
    expect(within(food).getByText('Vượt 345.000 ₫')).toBeInTheDocument();
    expect(within(food).getByRole('progressbar')).toHaveAttribute('data-tone', 'over');
  });

  it('switches month and recalculates', async () => {
    await openBudgets();
    await userEvent.click(screen.getByRole('button', { name: 'Tháng trước' }));
    expect(location()).toHaveTextContent('/spending/budgets?month=2026-09');
    const food = await screen.findByText('Còn 1.600.000 ₫');
    expect(food).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Ăn uống' })).getByText('38%')).toBeInTheDocument();
  });

  it('explains the budget alerts in the dock with a link to notification settings', async () => {
    const { screenInfo } = await openBudgets();
    const dock = screen.getByRole('complementary', { name: 'Bảng ngữ cảnh' });
    expect(within(dock).getByText('Nhắc nhở ngân sách')).toBeInTheDocument();
    expect(within(dock).getByText(/chạm 85% ngân sách/)).toBeInTheDocument();
    expect(within(dock).getByRole('link', { name: 'Cài đặt thông báo' })).toHaveAttribute('href', '/settings/notifications');
    expect(screenInfo.current).toMatchObject({ title: 'Ngân sách', hasDock: true });
  });
});

describe('Budgets states', () => {
  it('shows skeletons while loading', () => {
    renderSpending({
      route: '/spending/budgets',
      handlers: { 'spending.budget_status': () => new Promise(() => undefined) },
    });
    expect(screen.getAllByRole('status', { name: 'Đang tải' }).length).toBeGreaterThan(0);
  });

  it('shows an error with retry when the status cannot be loaded', async () => {
    renderSpending({
      route: '/spending/budgets',
      handlers: {
        'spending.budget_status': () => {
          throw new EngineCallError('internal', 'boom');
        },
      },
    });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Có lỗi xảy ra');
    expect(within(alert).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('invites the first budget when none is set', async () => {
    const data = createDemoData();
    data.categories.forEach((category) => {
      category.budgetVnd = null;
    });
    renderSpending({ route: '/spending/budgets', data });
    expect(await screen.findByText('Chưa đặt ngân sách nào')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thêm hạng mục' }));
    expect(await screen.findByRole('dialog', { name: 'Hạng mục mới' })).toBeInTheDocument();
  });
});

describe('Adding a category', () => {
  it('requires a budget amount because a budget-less category would not show here', async () => {
    const { engine } = await openBudgets();
    await userEvent.click(screen.getByRole('button', { name: 'Thêm hạng mục' }));
    const dialog = await screen.findByRole('dialog', { name: 'Hạng mục mới' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Tên hạng mục' }), 'Thú cưng');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo hạng mục' }));
    expect(await within(dialog).findByText('Nhập ngân sách hằng tháng cho hạng mục này.')).toBeInTheDocument();
    expect(engine.callsTo('spending.create_category')).toHaveLength(0);
  });

  it('creates the category with its budget and shows its card', async () => {
    const { engine } = await openBudgets();
    await userEvent.click(screen.getByRole('button', { name: 'Thêm hạng mục' }));
    const dialog = await screen.findByRole('dialog', { name: 'Hạng mục mới' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Tên hạng mục' }), 'Thú cưng');
    await userEvent.click(within(dialog).getByRole('button', { name: 'paw-print' }));
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Ngân sách tháng' }), '300000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo hạng mục' }));
    expect(await screen.findByRole('region', { name: 'Thú cưng' })).toBeInTheDocument();
    expect(engine.callsTo('spending.create_category')).toEqual([
      { name: 'Thú cưng', icon: 'paw-print', kind: 'expense', budgetVnd: 300_000 },
    ]);
    expect(await screen.findByText('Đã tạo hạng mục Thú cưng · ngân sách 300.000 ₫')).toBeInTheDocument();
  });
});

describe('Editing a budget', () => {
  it('changes the amount of one category', async () => {
    const { engine } = await openBudgets();
    await openMenu('Ăn uống', 'Sửa ngân sách');
    const dialog = await screen.findByRole('dialog', { name: 'Ngân sách Ăn uống' });
    const field = within(dialog).getByRole('textbox', { name: 'Ngân sách tháng' });
    expect(field).toHaveValue('2.600.000');
    await userEvent.clear(field);
    await userEvent.type(field, '3000000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu ngân sách' }));
    await waitFor(() => expect(engine.callsTo('spending.update_category')).toEqual([{ id: 'category-food', budgetVnd: 3_000_000 }]));
    expect(await within(screen.getByRole('region', { name: 'Ăn uống' })).findByText('78%')).toBeInTheDocument();
  });

  it('rejects an empty amount without calling the engine', async () => {
    const { engine } = await openBudgets();
    await openMenu('Ăn uống', 'Sửa ngân sách');
    const dialog = await screen.findByRole('dialog', { name: 'Ngân sách Ăn uống' });
    await userEvent.clear(within(dialog).getByRole('textbox', { name: 'Ngân sách tháng' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu ngân sách' }));
    expect(await within(dialog).findByText('Nhập ngân sách lớn hơn 0.')).toBeInTheDocument();
    expect(engine.callsTo('spending.update_category')).toHaveLength(0);
  });

  it('removes the budget but keeps the category', async () => {
    const { engine } = await openBudgets();
    await openMenu('Đi lại', 'Sửa ngân sách');
    const dialog = await screen.findByRole('dialog', { name: 'Ngân sách Đi lại' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bỏ ngân sách' }));
    await waitFor(() => expect(engine.callsTo('spending.update_category')).toEqual([{ id: 'category-transport', budgetVnd: null }]));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Đi lại' })).not.toBeInTheDocument());
  });
});

describe('Deleting a category', () => {
  it('shows the engine message when the category still has transactions', async () => {
    const { engine } = await openBudgets();
    await openMenu('Ăn uống', 'Xoá hạng mục');
    const confirm = await screen.findByRole('alertdialog', { name: 'Xoá hạng mục Ăn uống?' });
    await userEvent.click(within(confirm).getByRole('button', { name: 'Xoá' }));
    const failure = await screen.findByRole('dialog', { name: 'Không xoá được hạng mục' });
    expect(failure).toHaveTextContent('Hạng mục này vẫn còn giao dịch');
    expect(engine.callsTo('spending.delete_category')).toEqual([{ id: 'category-food' }]);
    await userEvent.click(within(failure).getByRole('button', { name: 'Đã hiểu' }));
    expect(await screen.findByRole('region', { name: 'Ăn uống' })).toBeInTheDocument();
  });

  it('deletes an unused category after confirmation', async () => {
    const data = createDemoData();
    data.categories.find((item) => item.id === 'category-shopping')!.budgetVnd = 1_500_000;
    await openBudgets({ data });
    await openMenu('Mua sắm', 'Xoá hạng mục');
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Xoá' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Mua sắm' })).not.toBeInTheDocument());
  });

  it('keeps everything when the confirmation is cancelled', async () => {
    const { engine } = await openBudgets();
    await openMenu('Đi lại', 'Xoá hạng mục');
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Huỷ' }));
    expect(engine.callsTo('spending.delete_category')).toHaveLength(0);
  });
});

describe('Narrow layout', () => {
  it('moves the alert explanation into the main content', async () => {
    const { screenInfo } = await openBudgets({ width: NARROW_WIDTH });
    expect(screenInfo.current?.hasDock).toBe(false);
    expect(screen.getByText('Nhắc nhở ngân sách')).toBeInTheDocument();
  });
});
