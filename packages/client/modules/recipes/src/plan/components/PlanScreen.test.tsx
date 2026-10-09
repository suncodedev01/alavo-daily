import { EngineCallError } from '@alavo-daily/common/engine';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RecipesBackend } from '../../testing/fakeBackend';
import { renderScreen } from '../../testing/renderScreen';
import { PlanScreen } from './PlanScreen';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 9, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

const location = () => screen.getByLabelText('Đường dẫn hiện tại');
const dock = () => screen.getByRole('complementary', { name: 'Bảng bên phải' });

function seededBackend() {
  const backend = new RecipesBackend();
  backend.seedPlan('2026-10-05', 'lunch', 'canh-chua');
  backend.seedPlan('2026-10-09', 'dinner', 'ga-kho', 4);
  backend.seedPlan('2026-10-09', 'dinner', 'rau-muong');
  backend.seedPlan('2026-10-10', 'lunch', 'ga-kho');
  return backend;
}

function renderPlan(route = '/recipes/plan', options: Partial<Parameters<typeof renderScreen>[1]> = {}) {
  return renderScreen(<PlanScreen />, { path: '/recipes/plan', route, backend: seededBackend(), ...options });
}

describe('plan states', () => {
  it('shows a skeleton while the plan loads', async () => {
    renderPlan('/recipes/plan', { handlers: { 'recipes.get_plan': () => new Promise(() => undefined) } });
    expect(await screen.findByRole('status', { name: 'Đang tải' })).toBeInTheDocument();
  });

  it('shows an error with a retry', async () => {
    let attempts = 0;
    renderPlan('/recipes/plan', {
      handlers: {
        'recipes.get_plan': () => {
          attempts += 1;
          if (attempts === 1) throw new EngineCallError('internal', 'boom');
          return [];
        },
      },
    });
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('table', { name: 'Thực đơn cả tuần' })).toBeInTheDocument();
  });

  it('shows empty slots with an add button each', async () => {
    renderPlan('/recipes/plan', { backend: new RecipesBackend() });
    const table = await screen.findByRole('table', { name: 'Thực đơn cả tuần' });
    expect(within(table).getAllByRole('button', { name: /^Thêm món/ })).toHaveLength(21);
    expect(within(dock()).getByText('0/21')).toBeInTheDocument();
    expect(within(dock()).getByText('Chưa có món nào trong tuần này.')).toBeInTheDocument();
  });
});

describe('week grid', () => {
  it('shows seven days and three meals for the current week', async () => {
    renderPlan();
    const table = await screen.findByRole('table', { name: 'Thực đơn cả tuần' });
    expect(screen.getByRole('heading', { name: 'Tuần 5 – 11 tháng 10' })).toBeInTheDocument();
    expect(within(table).getAllByRole('columnheader').filter((cell) => cell.textContent)).toHaveLength(7);
    expect(within(table).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual(['Sáng', 'Trưa', 'Tối']);
    expect(within(table).getByRole('columnheader', { current: 'date' })).toHaveTextContent('T69');
  });

  it('puts each dish in its day and slot', async () => {
    renderPlan();
    const table = await screen.findByRole('table', { name: 'Thực đơn cả tuần' });
    const dinnerRow = within(table).getByRole('rowheader', { name: 'Tối' }).closest('tr')!;
    expect(within(dinnerRow).getByRole('button', { name: 'Gà kho gừng' })).toBeInTheDocument();
    expect(within(dinnerRow).getByRole('button', { name: 'Rau muống xào tỏi' })).toBeInTheDocument();
    const lunchRow = within(table).getByRole('rowheader', { name: 'Trưa' }).closest('tr')!;
    expect(within(lunchRow).getAllByRole('button', { name: /Canh chua|Gà kho/ })).toHaveLength(2);
  });

  it('follows the week in the address', async () => {
    renderPlan('/recipes/plan?week=2026-10-14');
    expect(await screen.findByRole('heading', { name: 'Tuần 12 – 18 tháng 10' })).toBeInTheDocument();
  });
});

describe('week navigation', () => {
  it('goes to the previous and next week and back', async () => {
    renderPlan();
    const user = userEvent.setup();
    await screen.findByRole('table', { name: 'Thực đơn cả tuần' });
    expect(screen.queryByRole('button', { name: 'Về tuần này' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tuần trước' }));
    expect(await screen.findByRole('heading', { name: 'Tuần 28/9 – 4/10' })).toBeInTheDocument();
    expect(location()).toHaveTextContent('week=2026-09-28');
    await user.click(screen.getByRole('button', { name: 'Tuần sau' }));
    await user.click(screen.getByRole('button', { name: 'Tuần sau' }));
    expect(await screen.findByRole('heading', { name: 'Tuần 12 – 18 tháng 10' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Về tuần này' }));
    expect(await screen.findByRole('heading', { name: 'Tuần 5 – 11 tháng 10' })).toBeInTheDocument();
  });

  it('asks the engine for the shown week only', async () => {
    const view = renderPlan();
    await screen.findByRole('table', { name: 'Thực đơn cả tuần' });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tuần sau' }));
    await waitFor(() =>
      expect(view.engine.callsTo('recipes.get_plan')).toContainEqual({ from: '2026-10-12', days: 7 }),
    );
  });
});

describe('adding and removing dishes', () => {
  it('adds a searched recipe to a slot', async () => {
    const view = renderPlan();
    const user = userEvent.setup();
    await screen.findByRole('table', { name: 'Thực đơn cả tuần' });
    await user.click(screen.getByRole('button', { name: 'Thêm món T2 5, bữa Sáng' }));
    const picker = await screen.findByRole('dialog');
    expect(within(picker).getByText('Thêm món vào Thứ Hai · 5/10, bữa Sáng')).toBeInTheDocument();
    await user.type(within(picker).getByRole('searchbox', { name: 'Tìm công thức' }), 'rau');
    expect(within(picker).getAllByRole('button', { name: /Rau muống/ })).toHaveLength(1);
    expect(within(picker).queryByRole('button', { name: /Canh chua/ })).not.toBeInTheDocument();
    await user.click(within(picker).getByRole('button', { name: /Rau muống/ }));
    expect(view.engine.callsTo('recipes.add_to_plan')).toEqual([
      { date: '2026-10-05', slot: 'breakfast', recipeId: 'rau-muong', servings: 2 },
    ]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const table = screen.getByRole('table', { name: 'Thực đơn cả tuần' });
    const row = within(table).getByRole('rowheader', { name: 'Sáng' }).closest('tr')!;
    expect(await within(row).findByRole('button', { name: 'Rau muống xào tỏi' })).toBeInTheDocument();
  });

  it('tells when no recipe matches the search', async () => {
    renderPlan();
    const user = userEvent.setup();
    await screen.findByRole('table', { name: 'Thực đơn cả tuần' });
    await user.click(screen.getByRole('button', { name: 'Thêm món T2 5, bữa Sáng' }));
    await user.type(await screen.findByRole('searchbox', { name: 'Tìm công thức' }), 'zzz');
    expect(screen.getByText('Không có công thức khớp.')).toBeInTheDocument();
  });

  it('says there is nothing to add when there are no recipes', async () => {
    renderPlan('/recipes/plan', { backend: new RecipesBackend([]) });
    await screen.findByRole('table', { name: 'Thực đơn cả tuần' });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thêm món T2 5, bữa Sáng' }));
    expect(await screen.findByText('Chưa có công thức nào để thêm.')).toBeInTheDocument();
  });

  it('removes a dish from the menu of its chip', async () => {
    const view = renderPlan();
    const user = userEvent.setup();
    const table = await screen.findByRole('table', { name: 'Thực đơn cả tuần' });
    await user.click(within(table).getByRole('button', { name: 'Rau muống xào tỏi' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Xoá khỏi thực đơn' }));
    expect(view.engine.callsTo('recipes.remove_from_plan')).toHaveLength(1);
    await waitFor(() => expect(within(table).queryByRole('button', { name: 'Rau muống xào tỏi' })).not.toBeInTheDocument());
  });

  it('opens the recipe or starts cooking from the chip menu', async () => {
    renderPlan();
    const user = userEvent.setup();
    const table = await screen.findByRole('table', { name: 'Thực đơn cả tuần' });
    await user.click(within(table).getByRole('button', { name: 'Canh chua cá lóc' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Xem công thức' }));
    expect(location()).toHaveTextContent('/recipes/list/canh-chua');
  });

  it('starts cooking with the servings of the entry', async () => {
    renderPlan();
    const user = userEvent.setup();
    const table = await screen.findByRole('table', { name: 'Thực đơn cả tuần' });
    const dinnerRow = within(table).getByRole('rowheader', { name: 'Tối' }).closest('tr')!;
    await user.click(within(dinnerRow).getByRole('button', { name: 'Gà kho gừng' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Bắt đầu nấu' }));
    expect(location()).toHaveTextContent('/recipes/cook/ga-kho?servings=4');
  });
});

describe('plan dock', () => {
  it('counts the filled slots and prices the week by each entry servings', async () => {
    renderPlan();
    expect(await within(dock()).findByText('3/21')).toBeInTheDocument();
    expect(within(dock()).getByText('Chi phí nguyên liệu cả tuần ước tính 145.000 ₫.')).toBeInTheDocument();
  });

  it('ranks the most used dishes', async () => {
    renderPlan();
    expect(await within(dock()).findByText('2 lần')).toBeInTheDocument();
    expect(within(dock()).getByText('Gà kho gừng')).toBeInTheDocument();
  });

  it('jumps to the shopping list of the shown week', async () => {
    renderPlan();
    await userEvent.setup().click(await within(dock()).findByRole('button', { name: 'Tạo danh sách đi chợ' }));
    expect(location()).toHaveTextContent('/recipes/shopping?week=2026-10-05');
  });
});

describe('plan budget decision', () => {
  const needsYou = () => within(dock()).queryAllByText('Cần bạn');

  it('stays quiet while the projected spending is within the budget', async () => {
    renderPlan('/recipes/plan', { budget: { budgetVnd: 1_000_000, spentVnd: 200_000 } });
    expect(await within(dock()).findByText(/Chi phí đi chợ ước tính/)).toBeInTheDocument();
    expect(needsYou()).toHaveLength(0);
  });

  it('is not a decision at exactly the budget', async () => {
    const backend = new RecipesBackend();
    backend.seedPlan('2026-10-09', 'dinner', 'ga-kho', 4);
    renderPlan('/recipes/plan', { backend, budget: { budgetVnd: 1_000_000, spentVnd: 942_000 } });
    expect(await within(dock()).findByText(/Chi phí đi chợ ước tính 58\.000 ₫/)).toBeInTheDocument();
    expect(needsYou()).toHaveLength(0);
  });

  it('asks for a decision with a single chip as soon as it goes over', async () => {
    const backend = new RecipesBackend();
    backend.seedPlan('2026-10-09', 'dinner', 'ga-kho', 4);
    renderPlan('/recipes/plan', { backend, budget: { budgetVnd: 1_000_000, spentVnd: 942_001 } });
    expect(await within(dock()).findByText('Cần bạn')).toBeInTheDocument();
    expect(needsYou()).toHaveLength(1);
    expect(within(dock()).getByText(/sẽ vượt 1 ₫/)).toBeInTheDocument();
    expect(within(dock()).getByRole('button', { name: 'Tăng thêm 50.000 ₫' })).toBeInTheDocument();
  });

  it('raises the food budget when asked', async () => {
    const view = renderPlan('/recipes/plan', { budget: { budgetVnd: 250_000, spentVnd: 200_000 } });
    await userEvent.setup().click(await within(dock()).findByRole('button', { name: 'Tăng thêm 50.000 ₫' }));
    expect(view.engine.callsTo('spending.update_category')).toEqual([{ id: 'cat-food', budgetVnd: 300_000 }]);
    expect(await screen.findByText('Đã tăng ngân sách Ăn uống thêm 50.000 ₫')).toBeInTheDocument();
  });

  it('keeps the budget when told to and drops the chip', async () => {
    const view = renderPlan('/recipes/plan', { budget: { budgetVnd: 250_000, spentVnd: 200_000 } });
    await userEvent.setup().click(await within(dock()).findByRole('button', { name: 'Giữ nguyên' }));
    expect(needsYou()).toHaveLength(0);
    expect(view.engine.callsTo('spending.update_category')).toHaveLength(0);
    expect(within(dock()).getByText('Bạn đã chọn giữ nguyên ngân sách.')).toBeInTheDocument();
  });

  it('hides the section when there is no food budget', async () => {
    renderPlan('/recipes/plan', { budget: null });
    await within(dock()).findByText('3/21');
    expect(within(dock()).queryByText('Ảnh hưởng đến ngân sách')).not.toBeInTheDocument();
  });
});

describe('narrow plan', () => {
  it('shows one day at a time with a strip of days', async () => {
    const view = renderPlan('/recipes/plan', { width: 390 });
    const user = userEvent.setup();
    const strip = await screen.findByRole('group', { name: 'Chọn ngày' });
    expect(within(strip).getAllByRole('button')).toHaveLength(7);
    expect(within(strip).getByRole('button', { name: /T6/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Gà kho gừng/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Canh chua cá lóc/ })).not.toBeInTheDocument();
    await user.click(within(strip).getByRole('button', { name: /T2/ }));
    expect(await screen.findByRole('button', { name: /Canh chua cá lóc/ })).toBeInTheDocument();
    await waitFor(() => expect(view.described.at(-1)?.hasDock).toBe(false));
  });

  it('adds a dish to the chosen day from its slot card', async () => {
    const view = renderPlan('/recipes/plan', { width: 390 });
    const user = userEvent.setup();
    await screen.findByRole('group', { name: 'Chọn ngày' });
    const breakfast = screen.getByRole('region', { name: 'Sáng' });
    await user.click(within(breakfast).getByRole('button', { name: 'Thêm món' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /Canh chua/ }));
    expect(view.engine.callsTo('recipes.add_to_plan')).toEqual([
      { date: '2026-10-09', slot: 'breakfast', recipeId: 'canh-chua', servings: 2 },
    ]);
  });

  it('shows the week summary and the decision in the page, once', async () => {
    renderPlan('/recipes/plan', { width: 390, budget: { budgetVnd: 250_000, spentVnd: 200_000 } });
    expect(await screen.findByText('Ảnh hưởng đến ngân sách')).toBeInTheDocument();
    expect(screen.getAllByText('Cần bạn')).toHaveLength(1);
    expect(screen.getByRole('complementary', { name: 'Bảng bên phải' })).toBeEmptyDOMElement();
  });
});
