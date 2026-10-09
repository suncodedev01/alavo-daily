import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NOW, aFoodBudget, aShoppingList } from '../../../testing/hubEngine';
import { renderHub, setViewportWidth } from '../../../testing/renderHub';

beforeEach(() => {
  setViewportWidth(1280);
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
});
afterEach(() => vi.useRealTimers());

const overBudget = () => ({
  budget: aFoodBudget(800_000),
  shopping: aShoppingList(436_000, ['Gà', 'Gừng']),
});

describe('today spending and shopping', () => {
  it('shows today spending and the food budget line', async () => {
    renderHub('/today', { state: { budget: aFoodBudget(920_000) } });
    expect(await screen.findByText('113.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('23 giao dịch trong tháng')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Ngân sách Ăn uống' })).toHaveAttribute('aria-valuenow', '92');
  });

  it('summarises the shopping list', async () => {
    renderHub('/today', { state: { shopping: aShoppingList(436_000, ['Gà', 'Gừng']) } });
    expect(await screen.findByText('2 món')).toBeInTheDocument();
    expect(screen.getByText(/ước tính 436.000 ₫/)).toBeInTheDocument();
  });
});

describe('decision card', () => {
  it('shows the single yellow chip and the raise button when the cost exceeds what is left', async () => {
    renderHub('/today', { state: overBudget() });
    const dock = await screen.findByRole('complementary', { name: 'Bảng ngữ cảnh' });
    expect(await within(dock).findByText('Cần bạn quyết định')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-status="needs_you"]')).toHaveLength(1);
    expect(within(dock).getByText(/chỉ còn 200.000 ₫/)).toBeInTheDocument();
    expect(within(dock).getByRole('button', { name: 'Tăng thêm 300.000 ₫' })).toBeInTheDocument();
  });

  it('stays hidden when the cost fits the remaining budget', async () => {
    renderHub('/today', { state: { budget: aFoodBudget(500_000), shopping: aShoppingList(436_000, ['Gà']) } });
    await screen.findByText('113.000 ₫');
    expect(screen.queryByText('Cần bạn quyết định')).not.toBeInTheDocument();
    expect(document.querySelector('[data-status="needs_you"]')).toBeNull();
  });

  it('raises the food budget by the rounded amount and confirms with a toast', async () => {
    const user = userEvent.setup();
    const { engine } = renderHub('/today', { state: overBudget() });
    await user.click(await screen.findByRole('button', { name: 'Tăng thêm 300.000 ₫' }));
    await waitFor(() =>
      expect(engine.callsTo('spending.update_category')).toEqual([
        { id: 'category-food', budgetVnd: 1_300_000 },
      ]),
    );
    expect(await screen.findByText('Đã tăng ngân sách Ăn uống lên 1.300.000 ₫')).toBeInTheDocument();
  });

  it('hides the card when the person keeps the budget as it is', async () => {
    const user = userEvent.setup();
    const { engine } = renderHub('/today', { state: overBudget() });
    await user.click(await screen.findByRole('button', { name: 'Giữ nguyên' }));
    expect(screen.queryByText('Cần bạn quyết định')).not.toBeInTheDocument();
    expect(engine.callsTo('spending.update_category')).toEqual([]);
  });

  it('shows the card inside the main column on a narrow layout', async () => {
    setViewportWidth(390);
    renderHub('/today', { state: overBudget() });
    expect(await screen.findByText('Cần bạn quyết định')).toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
});

describe('dock sections', () => {
  it('lists recent notifications and upcoming bills', async () => {
    renderHub('/today', {
      state: {
        notifications: [
          {
            id: 'n1',
            module: 'alpha',
            title: 'Đến giờ nấu',
            body: '',
            subjectId: null,
            createdAt: NOW,
            read: false,
          },
        ],
      },
      handlers: {
        'spending.list_bills': () => [
          { id: 'b1', title: 'Internet FPT', icon: 'lightning', amountVnd: 230_000, dayOfMonth: 15, active: true },
        ],
      },
    });
    const dock = await screen.findByRole('complementary', { name: 'Bảng ngữ cảnh' });
    expect(await within(dock).findByText('Đến giờ nấu')).toBeInTheDocument();
    expect(await within(dock).findByText('Internet FPT')).toBeInTheDocument();
    expect(within(dock).getByText('Thứ Năm · 15/10')).toBeInTheDocument();
    expect(within(dock).getByText('230.000 ₫')).toBeInTheDocument();
  });
});

describe('first run', () => {
  const empty = { transactions: [], recipes: [] };

  it('offers sample data instead of the cards when nothing exists yet', async () => {
    renderHub('/today', { state: empty });
    expect(await screen.findByText('Chưa có dữ liệu nào')).toBeInTheDocument();
    expect(screen.queryByText('Thực đơn hôm nay')).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Bảng ngữ cảnh' })).not.toBeInTheDocument();
  });

  it('loads the sample data when asked', async () => {
    const user = userEvent.setup();
    const { engine } = renderHub('/today', { state: empty });
    await user.click(await screen.findByRole('button', { name: 'Nạp dữ liệu mẫu' }));
    await waitFor(() => expect(engine.callsTo('hub.load_demo_data')).toHaveLength(1));
    expect(await screen.findByText('Đã nạp dữ liệu mẫu')).toBeInTheDocument();
  });

  it('is not a first run when only one of the modules has data', async () => {
    renderHub('/today', { state: { transactions: [] } });
    expect(await screen.findByText('Hôm nay chưa có món nào')).toBeInTheDocument();
    expect(screen.queryByText('Chưa có dữ liệu nào')).not.toBeInTheDocument();
  });
});

describe('quick add', () => {
  it('builds the menu from the quick actions of every module', async () => {
    const user = userEvent.setup();
    renderHub('/today');
    await user.click(await screen.findByRole('button', { name: 'Thêm nhanh' }));
    expect(await screen.findByRole('menuitem', { name: 'Việc mới của Alpha' })).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(1);
  });

  it('opens the action path', async () => {
    const user = userEvent.setup();
    renderHub('/today');
    await user.click(await screen.findByRole('button', { name: 'Thêm nhanh' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Việc mới của Alpha' }));
    expect(screen.getByLabelText('Đường dẫn hiện tại')).toHaveTextContent('/alpha/one?new=1');
  });

  it('is absent when no module offers a quick action', async () => {
    renderHub('/today', { modules: [] });
    await screen.findByRole('heading', { name: 'Chào bạn' });
    expect(screen.queryByRole('button', { name: 'Thêm nhanh' })).not.toBeInTheDocument();
  });
});
