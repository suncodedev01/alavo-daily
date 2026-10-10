import { EngineCallError } from '@alavo-daily/common/engine';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearLoggedExpenses } from '../../logged-expenses';
import { RecipesBackend } from '../../testing/fakeBackend';
import { loggedTransaction } from '../../testing/fakeSpending';
import { renderScreen } from '../../testing/renderScreen';
import { ShoppingScreen } from './ShoppingScreen';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 9, 12));
});

afterEach(() => {
  vi.useRealTimers();
  clearLoggedExpenses();
});

const location = () => screen.getByLabelText('Đường dẫn hiện tại');
const dock = () => screen.getByRole('complementary', { name: 'Bảng bên phải' });

function seededBackend() {
  const backend = new RecipesBackend();
  backend.seedPlan('2026-10-05', 'lunch', 'canh-chua', 4);
  backend.seedPlan('2026-10-09', 'dinner', 'ga-kho', 4);
  backend.seedPlan('2026-10-10', 'lunch', 'ga-kho', 4);
  backend.seedPlan('2026-10-10', 'dinner', 'canh-chua', 4);
  return backend;
}

function renderShopping(route = '/recipes/shopping', options: Partial<Parameters<typeof renderScreen>[1]> = {}) {
  return renderScreen(<ShoppingScreen />, {
    path: '/recipes/shopping',
    route,
    backend: seededBackend(),
    handlers: { 'recipes.log_shopping_expense': () => loggedTransaction(203_000) },
    ...options,
  });
}

describe('shopping list states', () => {
  it('shows a skeleton while the list loads', async () => {
    renderShopping('/recipes/shopping', {
      handlers: { 'recipes.get_shopping_list': () => new Promise(() => undefined) },
    });
    expect(await screen.findByRole('status', { name: 'Đang tải' })).toBeInTheDocument();
  });

  it('shows an error and retries', async () => {
    let attempts = 0;
    renderShopping('/recipes/shopping', {
      handlers: {
        'recipes.get_shopping_list': () => {
          attempts += 1;
          if (attempts === 1) throw new EngineCallError('internal', 'boom');
          return { from: '2026-10-09', to: '2026-10-11', items: [], neededCount: 0, neededCostVnd: 0 };
        },
      },
    });
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Chưa có gì để mua')).toBeInTheDocument();
  });

  it('offers the week menu when nothing is planned, and still lets you add items', async () => {
    renderShopping('/recipes/shopping', { backend: new RecipesBackend() });
    expect(await screen.findByText('Chưa có gì để mua')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Thêm món' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Mở thực đơn tuần' }));
    expect(location()).toHaveTextContent('/recipes/plan');
  });
});

describe('shopping range', () => {
  it('says the range runs from today to the end of the week', async () => {
    renderShopping();
    expect(await screen.findByRole('heading', { name: 'Cần mua từ 9/10 đến 11/10' })).toBeInTheDocument();
    expect(screen.getByText('Gộp từ 2 món trong thực đơn. Món trùng nguyên liệu đã được cộng dồn.')).toBeInTheDocument();
  });

  it('follows the week in the address', async () => {
    const view = renderShopping('/recipes/shopping?week=2026-10-12');
    expect(await screen.findByRole('heading', { name: 'Cần mua từ 9/10 đến 18/10' })).toBeInTheDocument();
    expect(view.engine.callsTo('recipes.get_shopping_list')).toContainEqual({ from: '2026-10-09', to: '2026-10-18' });
  });

  it('leaves out dishes planned before today', async () => {
    renderShopping();
    await screen.findByRole('heading', { name: /Cần mua từ/ });
    const meat = screen.getByRole('region', { name: 'Thịt & cá' });
    expect(within(meat).getByText('1,2 kg')).toBeInTheDocument();
    expect(within(meat).getAllByRole('checkbox')).toHaveLength(2);
  });
});

describe('shopping groups', () => {
  it('groups by aisle, merges the same ingredient and names its recipes', async () => {
    renderShopping();
    await screen.findByRole('heading', { name: /Cần mua từ/ });
    expect(screen.getByRole('region', { name: 'Thịt & cá' })).toHaveTextContent('Thịt & cá · 2/2');
    expect(screen.getByRole('region', { name: 'Rau củ' })).toHaveTextContent('Rau củ · 2/2');
    expect(screen.getByRole('region', { name: 'Gia vị' })).toHaveTextContent('Gia vị · 0/1');
    const chicken = screen.getByRole('checkbox', { name: /Đùi gà/ });
    expect(chicken).toHaveAccessibleName(/Gà kho gừng/);
    expect(chicken).toHaveAccessibleName(/1,2 kg/);
    expect(chicken).toHaveAccessibleName(/108\.000 ₫/);
    expect(chicken).not.toBeChecked();
  });

  it('shows what is already at home as checked', async () => {
    renderShopping();
    await screen.findByRole('heading', { name: /Cần mua từ/ });
    const sauce = screen.getByRole('checkbox', { name: /Nước mắm/ });
    expect(sauce).toBeChecked();
    expect(sauce).toHaveAccessibleName(/Đã có sẵn/);
  });

  it('checks and unchecks an item through the engine', async () => {
    const view = renderShopping();
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: /Cần mua từ/ });
    await user.click(screen.getByRole('checkbox', { name: /Đùi gà/ }));
    expect(view.engine.callsTo('recipes.set_shopping_have')).toEqual([{ key: 'Đùi gà|g', have: true }]);
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /Đùi gà/ })).toBeChecked());
    expect(screen.getByText('3 món cần mua')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Đùi gà/ }));
    expect(view.engine.callsTo('recipes.set_shopping_have')[1]).toEqual({ key: 'Đùi gà|g', have: false });
    await waitFor(() => expect(screen.getByText('4 món cần mua')).toBeInTheDocument());
  });

  it('shows the count and the estimated cost in the summary bar', async () => {
    renderShopping();
    expect(await screen.findByText('4 món cần mua')).toBeInTheDocument();
    expect(screen.getByText('Ước tính 203.000 ₫')).toBeInTheDocument();
  });
});

describe('custom items', () => {
  it('adds an item by typing and pressing enter, then removes it', async () => {
    const view = renderShopping();
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: /Cần mua từ/ });
    await user.type(screen.getByRole('textbox', { name: 'Thêm món' }), 'Sữa tươi{Enter}');
    expect(view.engine.callsTo('recipes.add_shopping_item')).toEqual([{ name: 'Sữa tươi' }]);
    const added = await screen.findByRole('checkbox', { name: /Sữa tươi/ });
    expect(added).toHaveAccessibleName(/Món thêm tay/);
    expect(screen.getByRole('textbox', { name: 'Thêm món' })).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Xoá Sữa tươi khỏi danh sách' }));
    expect(view.engine.callsTo('recipes.remove_shopping_item')).toEqual([{ key: 'Sữa tươi|phần' }]);
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: /Sữa tươi/ })).not.toBeInTheDocument());
  });

  it('ignores a blank name', async () => {
    const view = renderShopping();
    await screen.findByRole('heading', { name: /Cần mua từ/ });
    await userEvent.setup().type(screen.getByRole('textbox', { name: 'Thêm món' }), '   {Enter}');
    expect(view.engine.callsTo('recipes.add_shopping_item')).toHaveLength(0);
  });

  it('only offers removal for hand-added items', async () => {
    renderShopping();
    await screen.findByRole('heading', { name: /Cần mua từ/ });
    expect(screen.queryByRole('button', { name: /^Xoá .* khỏi danh sách$/ })).not.toBeInTheDocument();
  });
});

describe('log shopping expense', () => {
  async function openDialog(options: Partial<Parameters<typeof renderScreen>[1]> = {}) {
    const view = renderShopping('/recipes/shopping', options);
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: /Cần mua từ/ });
    await user.click(screen.getByRole('button', { name: 'Ghi vào Chi tiêu' }));
    const dialog = await screen.findByRole('dialog');
    return { view, user, dialog };
  }

  it('defaults to the first wallet and the food category', async () => {
    const { dialog } = await openDialog();
    expect(within(dialog).getByRole('button', { name: 'Chi từ ví: Tiền mặt' })).toBeInTheDocument();
    expect(await within(dialog).findByRole('button', { name: 'Danh mục: Ăn uống' })).toBeInTheDocument();
    expect(within(dialog).getByText(/Ghi 203\.000 ₫ tiền đi chợ từ 9\/10 đến 11\/10/)).toBeInTheDocument();
  });

  it('records the expense for the range and shows the recorded state', async () => {
    const { view, user, dialog } = await openDialog();
    await within(dialog).findByRole('button', { name: 'Danh mục: Ăn uống' });
    await user.click(within(dialog).getByRole('button', { name: 'Ghi khoản chi' }));
    expect(view.engine.callsTo('recipes.log_shopping_expense')).toEqual([
      {
        from: '2026-10-09',
        to: '2026-10-11',
        walletId: 'w-cash',
        categoryId: 'cat-food',
        occurredOn: '2026-10-09',
      },
    ]);
    expect(await screen.findByText('Đã ghi 203.000 ₫ vào Chi tiêu')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ghi vào Chi tiêu' })).not.toBeInTheDocument();
    expect(screen.getByText('Đã ghi vào Chi tiêu')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('lets the person choose another wallet and category', async () => {
    const { view, user, dialog } = await openDialog();
    await within(dialog).findByRole('button', { name: 'Danh mục: Ăn uống' });
    await user.click(within(dialog).getByRole('button', { name: 'Chi từ ví: Tiền mặt' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'Ngân hàng' }));
    await user.click(within(dialog).getByRole('button', { name: 'Danh mục: Ăn uống' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'Khác' }));
    await user.click(within(dialog).getByRole('button', { name: 'Ghi khoản chi' }));
    expect(view.engine.callsTo('recipes.log_shopping_expense')[0]).toMatchObject({
      walletId: 'w-bank',
      categoryId: 'cat-other',
    });
  });

  it('shows the engine error inside the dialog', async () => {
    const { user, dialog } = await openDialog({
      handlers: {
        'recipes.log_shopping_expense': () => {
          throw new EngineCallError('validation', 'nothing with an estimated cost is left to buy');
        },
      },
    });
    await within(dialog).findByRole('button', { name: 'Danh mục: Ăn uống' });
    await user.click(within(dialog).getByRole('button', { name: 'Ghi khoản chi' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Chưa có món nào cần mua có chi phí ước tính');
  });

  it('cannot record without a wallet', async () => {
    const { dialog } = await openDialog({ handlers: { 'spending.list_wallets': () => [] } });
    expect(await within(dialog).findByText('Chưa có ví nào. Hãy tạo ví trong Chi tiêu trước.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Ghi khoản chi' })).toBeDisabled();
  });

  it('cannot be started when nothing with a cost is left to buy', async () => {
    renderShopping('/recipes/shopping', { backend: new RecipesBackend([]) });
    expect(await screen.findByRole('button', { name: 'Ghi vào Chi tiêu' })).toBeDisabled();
  });

  it('closes without recording on cancel', async () => {
    const { view, user, dialog } = await openDialog();
    await user.click(within(dialog).getByRole('button', { name: 'Huỷ' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(view.engine.callsTo('recipes.log_shopping_expense')).toHaveLength(0);
  });
});

describe('shopping dock', () => {
  const needsYou = () => within(dock()).queryAllByText('Cần bạn');

  it('lists the recipes behind the list and links to them', async () => {
    renderShopping();
    expect(await within(dock()).findByText('Từ những món nào (2)')).toBeInTheDocument();
    await userEvent.setup().click(await within(dock()).findByRole('link', { name: /Canh chua cá lóc/ }));
    expect(location()).toHaveTextContent('/recipes/list/canh-chua');
  });

  it('is calm when the projection fits the budget exactly', async () => {
    renderShopping('/recipes/shopping', { budget: { budgetVnd: 1_000_000, spentVnd: 797_000 } });
    expect(await within(dock()).findByText(/Ăn uống: 1\.000\.000 ₫ \/ 1\.000\.000 ₫/)).toBeInTheDocument();
    expect(needsYou()).toHaveLength(0);
  });

  it('asks for one decision as soon as it goes over, with the raise and keep choices', async () => {
    const view = renderShopping('/recipes/shopping', { budget: { budgetVnd: 1_000_000, spentVnd: 797_001 } });
    expect(await within(dock()).findByText('Cần bạn')).toBeInTheDocument();
    expect(needsYou()).toHaveLength(1);
    await userEvent.setup().click(within(dock()).getByRole('button', { name: 'Tăng thêm 50.000 ₫' }));
    expect(view.engine.callsTo('spending.update_category')).toEqual([{ id: 'cat-food', budgetVnd: 1_050_000 }]);
  });

  it('counts the recorded expense once spending includes it', async () => {
    const view = renderShopping('/recipes/shopping', { budget: { budgetVnd: 1_000_000, spentVnd: 797_001 } });
    const user = userEvent.setup();
    await screen.findByText('Cần bạn');
    await user.click(screen.getByRole('button', { name: 'Ghi vào Chi tiêu' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('button', { name: 'Danh mục: Ăn uống' });
    await user.click(within(dialog).getByRole('button', { name: 'Ghi khoản chi' }));
    await waitFor(() => expect(view.engine.callsTo('recipes.log_shopping_expense')).toHaveLength(1));
    await waitFor(() => expect(needsYou()).toHaveLength(0));
    expect(within(dock()).getByText(/Đã ghi chi phí đi chợ/)).toBeInTheDocument();
  });

  it('hides the budget section without a food budget', async () => {
    renderShopping('/recipes/shopping', { budget: null });
    await within(dock()).findByText('Từ những món nào (2)');
    expect(within(dock()).queryByText('Ảnh hưởng đến ngân sách')).not.toBeInTheDocument();
  });
});

describe('narrow shopping', () => {
  it('shows the budget card and the sources in the page and keeps the summary bar', async () => {
    const view = renderShopping('/recipes/shopping', {
      width: 390,
      budget: { budgetVnd: 1_000_000, spentVnd: 797_001 },
    });
    expect(await screen.findByText('Ảnh hưởng đến ngân sách')).toBeInTheDocument();
    expect(screen.getAllByText('Cần bạn')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Ghi vào Chi tiêu' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Bảng bên phải' })).toBeEmptyDOMElement();
    await waitFor(() => expect(view.described.at(-1)?.hasDock).toBe(false));
  });

  it('opens the expense sheet', async () => {
    renderShopping('/recipes/shopping', { width: 390 });
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Ghi vào Chi tiêu' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
