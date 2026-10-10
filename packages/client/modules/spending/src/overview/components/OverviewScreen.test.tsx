import { EngineCallError } from '@alavo-daily/common/engine';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createDemoData, createEmptyData } from '../../testing/fixtures';
import { freezeToday, NARROW_WIDTH, renderSpending } from '../../testing/renderSpending';

freezeToday();

const location = () => screen.getByLabelText('Địa chỉ hiện tại', { selector: 'output' });

function categoryBudget(data: ReturnType<typeof createDemoData>, id: string, budgetVnd: number | null) {
  const category = data.categories.find((item) => item.id === id)!;
  category.budgetVnd = budgetVnd;
}

async function overview(options: Parameters<typeof renderSpending>[0] = {}) {
  const view = renderSpending({ route: '/spending/overview', ...options });
  await screen.findByText('Tổng số dư');
  return view;
}

describe('Overview loading and error states', () => {
  it('shows skeletons while the summary loads', () => {
    renderSpending({
      route: '/spending/overview',
      handlers: { 'spending.month_summary': () => new Promise(() => undefined) },
    });
    expect(screen.getAllByRole('status', { name: 'Đang tải' }).length).toBeGreaterThan(0);
  });

  it('shows an error with a retry button, and retry loads the data', async () => {
    let failing = true;
    const data = createDemoData();
    const { engine } = renderSpending({
      route: '/spending/overview',
      data,
      handlers: {
        'spending.month_summary': ({ month, today }) => {
          if (failing) throw new EngineCallError('internal', 'boom');
          return {
            month,
            incomeVnd: 1,
            expenseVnd: 1,
            netVnd: 0,
            previousExpenseVnd: 0,
            expenseDeltaPct: null,
            totalBalanceVnd: 5_000,
            dailyExpenseVnd: [0],
            transactionCount: 0,
            today,
          } as never;
        },
      },
    });
    const alerts = await screen.findAllByRole('alert');
    expect(alerts[0]).toHaveTextContent('Có lỗi xảy ra');
    failing = false;
    await userEvent.click(within(alerts[0]!).getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Tổng số dư')).toBeInTheDocument();
    expect(engine.callsTo('spending.month_summary').length).toBeGreaterThan(1);
  });
});

describe('Overview data', () => {
  it('shows total balance, net cash flow and the transaction count', async () => {
    await overview();
    const balance = screen.getByRole('region', { name: 'Tổng số dư' });
    expect(within(balance).getByText('54.677.000 ₫')).toBeInTheDocument();
    expect(within(balance).getByText('Dòng tiền ròng tháng 10')).toBeInTheDocument();
    expect(within(balance).getByText('+17.877.000 ₫')).toBeInTheDocument();
    expect(within(balance).getByText('Trên 3 ví và tài khoản')).toBeInTheDocument();
    expect(within(balance).getByText('13 giao dịch')).toBeInTheDocument();
  });

  it('shows income and expense cards with the change against last month', async () => {
    await overview();
    const income = screen.getByRole('region', { name: 'Thu nhập' });
    expect(within(income).getByText('+28.000.000 ₫')).toBeInTheDocument();
    expect(within(income).getByText('Cao hơn tháng 9 4%')).toBeInTheDocument();
    const expense = screen.getByRole('region', { name: 'Chi tiêu' });
    expect(within(expense).getByText('10.123.000 ₫')).toBeInTheDocument();
    expect(within(expense).getByText('Cao hơn tháng 9 912%')).toBeInTheDocument();
  });

  it('says there is nothing to compare when last month had no spending', async () => {
    const data = createDemoData();
    data.transactions = data.transactions.filter((item) => item.occurredOn.startsWith('2026-10'));
    await overview({ data });
    const expense = screen.getByRole('region', { name: 'Chi tiêu' });
    expect(within(expense).getByText('Chưa có số liệu tháng 9 để so sánh')).toBeInTheDocument();
  });

  it('draws the daily chart as an image with the average in its label', async () => {
    await overview();
    const chart = await screen.findByRole('img', { name: /Chi tiêu theo ngày, trung bình 291\.444 ₫ mỗi ngày/ });
    expect(chart).toBeInTheDocument();
    expect(screen.getByText('Hôm nay')).toBeInTheDocument();
    expect(screen.getByText('Không gồm chi phí cố định')).toBeInTheDocument();
  });

  it('lists the top budgets with meters sorted by how much is used', async () => {
    await overview();
    const card = await screen.findByRole('region', { name: 'Ngân sách' });
    expect(await within(card).findByText('2.623.000 ₫ / 4.600.000 ₫')).toBeInTheDocument();
    const food = within(card).getByRole('progressbar', { name: 'Đã dùng ngân sách Ăn uống' });
    expect(food).toHaveAttribute('aria-valuenow', '90');
    expect(food).toHaveAttribute('data-tone', 'warn');
    const names = within(card).getAllByRole('listitem').map((item) => item.textContent);
    expect(names[0]).toContain('Ăn uống');
  });

  it('shows the latest transactions and opens one in the transactions screen', async () => {
    await overview();
    const card = await screen.findByRole('region', { name: 'Giao dịch gần đây' });
    const links = await within(card).findAllByRole('link', { name: /Highlands Coffee|Grab đi làm/ });
    expect(links).toHaveLength(2);
    await userEvent.click(links[0]!);
    expect(location()).toHaveTextContent(/^\/spending\/transactions\/tx-\d+\?month=2026-10$/);
  });

  it('summarises goals with progress meters', async () => {
    await overview();
    const card = await screen.findByRole('region', { name: 'Mục tiêu tiết kiệm' });
    const emergency = await within(card).findByRole('progressbar', { name: 'Tiến độ Quỹ khẩn cấp' });
    expect(emergency).toHaveAttribute('aria-valuenow', '64');
    expect(within(card).getByText('38.500.000 ₫ / 60.000.000 ₫')).toBeInTheDocument();
  });

  it('links to the budgets and goals screens', async () => {
    await overview();
    await userEvent.click(await screen.findByRole('link', { name: 'Chi tiết' }));
    expect(location()).toHaveTextContent('/spending/budgets');
  });
});

describe('Decision card', () => {
  it('shows one decision card with a single yellow chip for the most used budget', async () => {
    await overview();
    expect(await screen.findByText('Cần bạn quyết định')).toBeInTheDocument();
    expect(screen.getAllByText('Cần bạn')).toHaveLength(1);
    expect(
      screen.getByText('Ăn uống đã dùng 90% ngân sách, còn 255.000 ₫ cho 22 ngày, khoảng 11.591 ₫ mỗi ngày.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tăng thêm 600.000 ₫' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Giữ nguyên' })).toBeInTheDocument();
  });

  it('is not hardcoded to food: it picks whichever budget is used the most', async () => {
    const data = createDemoData();
    categoryBudget(data, 'category-food', 10_000_000);
    categoryBudget(data, 'category-transport', 50_000);
    await overview({ data });
    expect(await screen.findByText(/^Đi lại đã dùng 96% ngân sách/)).toBeInTheDocument();
  });

  it('is hidden below 85% of every budget', async () => {
    const data = createDemoData();
    categoryBudget(data, 'category-food', 2_800_000);
    await overview({ data });
    await screen.findByRole('region', { name: 'Ngân sách' });
    expect(screen.queryByText('Cần bạn quyết định')).not.toBeInTheDocument();
  });

  it('says the budget is exceeded when spending is over 100%', async () => {
    const data = createDemoData();
    categoryBudget(data, 'category-food', 2_000_000);
    await overview({ data });
    expect(await screen.findByText('Ăn uống đã vượt ngân sách 345.000 ₫ (117%).')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tăng thêm 400.000 ₫' })).toBeInTheDocument();
  });

  it('raises the budget and then disappears because the budget is no longer tight', async () => {
    const { engine } = await overview();
    await userEvent.click(await screen.findByRole('button', { name: 'Tăng thêm 600.000 ₫' }));
    await waitFor(() => expect(engine.callsTo('spending.update_category')).toHaveLength(1));
    expect(engine.callsTo('spending.update_category')[0]).toEqual({ id: 'category-food', budgetVnd: 3_200_000 });
    await waitFor(() => expect(screen.queryByText('Cần bạn quyết định')).not.toBeInTheDocument());
  });

  it('keeps the budget as it is and stays hidden after a remount', async () => {
    const { engine, unmount } = await overview();
    await userEvent.click(await screen.findByRole('button', { name: 'Giữ nguyên' }));
    expect(screen.queryByText('Cần bạn quyết định')).not.toBeInTheDocument();
    expect(engine.callsTo('spending.update_category')).toHaveLength(0);
    unmount();
    await overview();
    await screen.findByRole('region', { name: 'Ngân sách' });
    expect(screen.queryByText('Cần bạn quyết định')).not.toBeInTheDocument();
  });

  it('shows the engine error when raising fails', async () => {
    await overview({
      handlers: {
        'spending.update_category': () => {
          throw new EngineCallError('not_found', 'category not found');
        },
      },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Tăng thêm 600.000 ₫' }));
    expect(await screen.findByText('Không tìm thấy dữ liệu này. Có thể nó đã bị xoá.')).toBeInTheDocument();
  });
});

describe('Upcoming bills and month comparison', () => {
  it('lists active bills by due date with weekday and amount', async () => {
    await overview();
    expect(await screen.findByText('Sắp đến hạn')).toBeInTheDocument();
    expect(await screen.findByText('Thẻ tín dụng Techcombank')).toBeInTheDocument();
    expect(screen.getByText('Thứ Hai, 12/10')).toBeInTheDocument();
    expect(screen.getByText('2.340.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('Thứ Năm, 15/10')).toBeInTheDocument();
    expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
  });

  it('opens the bills dialog from the upcoming section', async () => {
    await overview();
    await userEvent.click(await screen.findByRole('button', { name: 'Quản lý khoản định kỳ' }));
    expect(await screen.findByRole('dialog', { name: 'Khoản định kỳ' })).toBeInTheDocument();
  });

  it('compares this month with last month', async () => {
    await overview();
    await userEvent.click(await screen.findByRole('button', { name: 'Tháng này so với tháng trước' }));
    expect(await screen.findByText('Chi 10.123.000 ₫ so với 1.000.000 ₫, cao hơn 912%.')).toBeInTheDocument();
  });

  it('opens the wallets dialog from the balance card', async () => {
    await overview();
    await userEvent.click(screen.getByRole('button', { name: 'Quản lý ví' }));
    expect(await screen.findByRole('dialog', { name: 'Quản lý ví' })).toBeInTheDocument();
  });
});

describe('Month switching and URL state', () => {
  it('defaults to the current month from the local date', async () => {
    await overview();
    expect(screen.getByText('Tháng 10, 2026')).toBeInTheDocument();
  });

  it('moves to the previous month, updates the URL and hides the decision card', async () => {
    const { engine } = await overview();
    await userEvent.click(screen.getByRole('button', { name: 'Tháng trước' }));
    expect(screen.getByText('Tháng 9, 2026')).toBeInTheDocument();
    expect(location()).toHaveTextContent('/spending/overview?month=2026-09');
    await waitFor(() =>
      expect(engine.callsTo('spending.month_summary')).toContainEqual({ month: '2026-09', today: '2026-10-09' }),
    );
    await waitFor(() => expect(screen.queryByText('Cần bạn quyết định')).not.toBeInTheDocument());
    expect(screen.queryByText('Hôm nay')).not.toBeInTheDocument();
  });

  it('reads the month from the URL', async () => {
    await overview({ route: '/spending/overview?month=2026-09' });
    expect(screen.getByText('Tháng 9, 2026')).toBeInTheDocument();
    expect(await screen.findByText('Thu nhập tháng 9')).toBeInTheDocument();
  });

  it('falls back to the current month for a broken month parameter', async () => {
    await overview({ route: '/spending/overview?month=hello' });
    expect(screen.getByText('Tháng 10, 2026')).toBeInTheDocument();
  });

  it('sends the client date, never an engine date, with each query', async () => {
    const { engine } = await overview();
    expect(engine.callsTo('spending.budget_status')[0]).toEqual({ month: '2026-10', today: '2026-10-09' });
  });
});

describe('Empty state', () => {
  it('invites the first transaction and opens the add dialog from the URL parameter', async () => {
    renderSpending({ route: '/spending/overview', data: createEmptyData() });
    const card = await screen.findByRole('region', { name: 'Giao dịch gần đây' });
    await userEvent.click(await within(card).findByRole('button', { name: 'Thêm giao dịch' }));
    expect(location()).toHaveTextContent('/spending/overview?new=1');
    expect(await screen.findByRole('dialog', { name: 'Thêm giao dịch' })).toBeInTheDocument();
  });

  it('explains missing chart data, goals and bills', async () => {
    renderSpending({ route: '/spending/overview', data: createEmptyData() });
    expect(await screen.findByText('Chưa có khoản chi nào trong tháng này.')).toBeInTheDocument();
    expect(await screen.findByText('Bạn chưa có mục tiêu tiết kiệm nào.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tạo mục tiêu' })).toBeInTheDocument();
    expect(await screen.findByText('Chưa có khoản định kỳ nào sắp đến hạn.')).toBeInTheDocument();
  });

  it('explains that no budget is set', async () => {
    const data = createEmptyData();
    data.categories.forEach((category) => {
      category.budgetVnd = null;
    });
    renderSpending({ route: '/spending/overview', data });
    expect(await screen.findByText('Chưa đặt ngân sách cho hạng mục nào.')).toBeInTheDocument();
  });
});

describe('Narrow layout', () => {
  it('puts the decision card, bills and comparison in the main content and has no dock', async () => {
    const { screenInfo } = await overview({ width: NARROW_WIDTH });
    expect(await screen.findByText('Cần bạn quyết định')).toBeInTheDocument();
    expect(await screen.findByText('Sắp đến hạn')).toBeInTheDocument();
    expect(screen.getByText('Tháng này so với tháng trước')).toBeInTheDocument();
    expect(screenInfo.current).toMatchObject({ title: 'Tổng quan', hasDock: false });
  });

  it('greets with the date instead of a title row, and skips the add button and month switcher', async () => {
    const { screenInfo } = await overview({ width: NARROW_WIDTH });
    expect(screen.getByRole('heading', { name: 'Chào bạn' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm giao dịch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tháng trước' })).not.toBeInTheDocument();
    expect(screenInfo.current).toMatchObject({ hideNarrowTitle: true });
  });

  it('lists every wallet with its balance right after the total, with a way to manage them', async () => {
    await overview({ width: NARROW_WIDTH });
    const card = await screen.findByRole('region', { name: 'Các khoản tiền' });
    expect(await within(card).findByText('Techcombank')).toBeInTheDocument();
    expect(within(card).getByText('Ví MoMo')).toBeInTheDocument();
    expect(within(card).getByText('Tiền mặt')).toBeInTheDocument();
    await userEvent.click(within(card).getByRole('link', { name: 'Quản lý' }));
    expect(location()).toHaveTextContent('/spending/accounts');
  });

  it('keeps the wallet list in the sidebar, not on the page, on a wide layout', async () => {
    await overview();
    expect(screen.queryByRole('region', { name: 'Các khoản tiền' })).not.toBeInTheDocument();
  });

  it('shows the add button and the dock on a wide layout', async () => {
    const { screenInfo } = await overview();
    expect(screen.getByRole('button', { name: 'Thêm giao dịch' })).toBeInTheDocument();
    expect(screenInfo.current).toMatchObject({ title: 'Tổng quan', hasDock: true, hasList: false });
  });
});
