import { EngineCallError } from '@alavo-daily/common/engine';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RecipesBackend } from '../../testing/fakeBackend';
import { renderScreen } from '../../testing/renderScreen';
import { RecipeListScreen } from './RecipeListScreen';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 9, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

const location = () => screen.getByLabelText('Đường dẫn hiện tại');

function renderList(route = '/recipes/list/ga-kho', options: Partial<Parameters<typeof renderScreen>[1]> = {}) {
  return renderScreen(<RecipeListScreen />, { path: '/recipes/list/:id?', route, ...options });
}

describe('recipe list pane', () => {
  it('shows a skeleton while the recipes load', async () => {
    renderList('/recipes/list/ga-kho', { handlers: { 'recipes.list': () => new Promise(() => undefined) } });
    expect(await screen.findAllByRole('status', { name: 'Đang tải' })).not.toHaveLength(0);
  });

  it('lists every recipe with its time, level and cost', async () => {
    renderList();
    const list = await screen.findByRole('list', { name: 'Danh sách công thức' });
    expect(within(list).getAllByRole('link')).toHaveLength(3);
    expect(within(list).getByRole('link', { name: /Gà kho gừng/ })).toHaveAccessibleName(/55 phút · Dễ · 30\.500/);
    expect(screen.getByText('3/3 công thức')).toBeInTheDocument();
  });

  it('marks the selected recipe and favorites', async () => {
    renderList('/recipes/list/canh-chua');
    const list = await screen.findByRole('list', { name: 'Danh sách công thức' });
    expect(within(list).getByRole('link', { name: /Canh chua/ })).toHaveAttribute('aria-current', 'page');
    expect(within(list).getAllByRole('img', { name: 'Yêu thích' })).toHaveLength(1);
  });

  it('selects the first recipe on a wide layout', async () => {
    renderList('/recipes/list');
    await waitFor(() => expect(location()).toHaveTextContent('/recipes/list/ga-kho'));
  });

  it('filters by name without needing accents', async () => {
    renderList();
    await screen.findByRole('list', { name: 'Danh sách công thức' });
    await userEvent.setup().type(screen.getByRole('searchbox', { name: 'Tìm công thức' }), 'canh');
    const list = screen.getByRole('list', { name: 'Danh sách công thức' });
    expect(within(list).getAllByRole('link')).toHaveLength(1);
    expect(location()).toHaveTextContent('q=canh');
    expect(screen.getByText('1/3 công thức')).toBeInTheDocument();
  });

  it('filters by tag and by favorites', async () => {
    renderList();
    const user = userEvent.setup();
    await screen.findByRole('list', { name: 'Danh sách công thức' });
    await user.click(screen.getByRole('button', { name: 'Rau' }));
    expect(screen.getByRole('button', { name: 'Rau' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('list', { name: 'Danh sách công thức' })).getAllByRole('link')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Yêu thích' }));
    expect(screen.getByRole('link', { name: /Gà kho gừng/ })).toBeInTheDocument();
    expect(location()).toHaveTextContent('tag=favorites');
  });

  it('says when nothing matches', async () => {
    renderList();
    await screen.findByRole('list', { name: 'Danh sách công thức' });
    await userEvent.setup().type(screen.getByRole('searchbox', { name: 'Tìm công thức' }), 'zzz');
    expect(screen.getByText('Không có công thức khớp.')).toBeInTheDocument();
  });
});

describe('recipe list empty and error states', () => {
  it('offers to add a recipe and mentions the sample data', async () => {
    renderList('/recipes/list', { backend: new RecipesBackend([]) });
    expect(await screen.findByText(/nạp dữ liệu mẫu trong Cài đặt/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thêm công thức' }));
    expect(location()).toHaveTextContent('/recipes/new');
  });

  it('shows the error and retries', async () => {
    let attempts = 0;
    renderList('/recipes/list/ga-kho', {
      handlers: {
        'recipes.list': () => {
          attempts += 1;
          if (attempts === 1) throw new EngineCallError('internal', 'boom');
          return [];
        },
      },
    });
    const user = userEvent.setup();
    expect((await screen.findAllByText('Không tải được dữ liệu')).length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole('button', { name: 'Thử lại' })[0]!);
    await waitFor(() => expect(screen.queryByText('Không tải được dữ liệu')).not.toBeInTheDocument());
  });

  it('shows not found for an unknown recipe', async () => {
    renderList('/recipes/list/missing');
    expect((await screen.findAllByText(/Không tìm thấy dữ liệu này/)).length).toBeGreaterThan(0);
  });
});

describe('recipe detail', () => {
  it('shows the meta, ingredients scaled to the household and steps with timers', async () => {
    renderList();
    expect(await screen.findByRole('heading', { name: 'Gà kho gừng' })).toBeInTheDocument();
    expect(screen.getByText('Chuẩn bị').closest('div')).toHaveTextContent('15 phút');
    const ingredients = screen.getByRole('list', { name: 'Nguyên liệu' });
    expect(within(ingredients).getByText('300 g')).toBeInTheDocument();
    const steps = screen.getByRole('list', { name: 'Các bước' });
    expect(within(steps).getAllByRole('listitem')).toHaveLength(3);
    expect(within(steps).getByText('15 phút')).toBeInTheDocument();
  });

  it('shows the photo as the cover when the recipe has one', async () => {
    const backend = new RecipesBackend();
    backend.setPhoto('ga-kho', 'data:image/jpeg;base64,AAAA');
    renderList('/recipes/list/ga-kho', { backend });
    const cover = await screen.findByRole('img', { name: 'Ảnh món Gà kho gừng' });
    expect(cover).toHaveAttribute('src', 'data:image/jpeg;base64,AAAA');
  });

  it('keeps the icon cover when the recipe has no photo', async () => {
    renderList();
    await screen.findByRole('heading', { name: 'Gà kho gừng' });
    expect(screen.queryByRole('img', { name: /^Ảnh món/ })).not.toBeInTheDocument();
  });

  it('shows the estimated cost of the recipe and of one serving', async () => {
    renderList();
    await screen.findByRole('heading', { name: 'Gà kho gừng' });
    expect(await screen.findByText('30.500 ₫')).toBeInTheDocument();
    expect(screen.getByText('cho 2 người · 15.250 ₫ mỗi người')).toBeInTheDocument();
  });

  it('rescales ingredients and cost when the servings change', async () => {
    renderList();
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Gà kho gừng' });
    await user.click(screen.getByRole('button', { name: 'Tăng khẩu phần' }));
    await user.click(screen.getByRole('button', { name: 'Tăng khẩu phần' }));
    expect(within(screen.getByRole('list', { name: 'Nguyên liệu' })).getByText('600 g')).toBeInTheDocument();
    expect(await screen.findByText('61.000 ₫')).toBeInTheDocument();
    expect(screen.getByText(/cho 4 người/)).toBeInTheDocument();
  });

  it('toggles the favorite', async () => {
    const view = renderList('/recipes/list/canh-chua');
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Canh chua cá lóc' });
    const main = within(screen.getByRole('main'));
    const toggle = main.getByRole('button', { name: 'Yêu thích' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(view.engine.callsTo('recipes.set_favorite')).toEqual([{ id: 'canh-chua', favorite: true }]);
    expect(await main.findByRole('button', { name: 'Bỏ yêu thích' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('starts cooking with the chosen servings', async () => {
    renderList();
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Gà kho gừng' });
    await user.click(screen.getByRole('button', { name: 'Tăng khẩu phần' }));
    await user.click(screen.getByRole('button', { name: 'Bắt đầu nấu' }));
    expect(location()).toHaveTextContent('/recipes/cook/ga-kho?servings=3');
  });
});

describe('add to plan and shopping', () => {
  it('adds the recipe to a day and slot chosen in the popover', async () => {
    const view = renderList();
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Gà kho gừng' });
    await user.click(screen.getByRole('button', { name: 'Thêm vào thực đơn' }));
    await user.click(await screen.findByRole('button', { name: 'Hôm nay · 9/10, Tối' }));
    expect(view.engine.callsTo('recipes.add_to_plan')).toEqual([
      { date: '2026-10-09', slot: 'dinner', recipeId: 'ga-kho', servings: 2 },
    ]);
    expect(await screen.findByText(/Đã thêm Gà kho gừng vào Hôm nay · 9\/10, bữa Tối/)).toBeInTheDocument();
    expect(await screen.findByText('Trong thực đơn tuần (1)')).toBeInTheDocument();
  });

  it('offers the next seven days', async () => {
    renderList();
    await screen.findByRole('heading', { name: 'Gà kho gừng' });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thêm vào thực đơn' }));
    expect(await screen.findByRole('button', { name: 'Thứ Năm · 15/10, Sáng' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hôm nay · 9/10, Sáng' })).toBeInTheDocument();
  });

  it('adds the scaled ingredients to the shopping list', async () => {
    const view = renderList();
    await screen.findByRole('heading', { name: 'Gà kho gừng' });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thêm vào đi chợ' }));
    await waitFor(() => expect(view.engine.callsTo('recipes.add_shopping_item')).toHaveLength(3));
    expect(view.engine.callsTo('recipes.add_shopping_item')[0]).toEqual({
      name: 'Đùi gà',
      quantity: 300,
      unit: 'g',
      aisle: 'meat_fish',
    });
    expect(await screen.findByText('Đã thêm 3 nguyên liệu vào danh sách đi chợ')).toBeInTheDocument();
  });
});

describe('recipe dock', () => {
  it('shows the cost for the servings and its share of the remaining food budget', async () => {
    renderList();
    const dock = await screen.findByRole('complementary', { name: 'Bảng bên phải' });
    expect(await within(dock).findByText('30.500 ₫')).toBeInTheDocument();
    expect(within(dock).getByText(/cho 2 người · 15\.250 ₫ mỗi người/)).toBeInTheDocument();
    expect(
      within(dock).getByText(/Bằng 4% số tiền còn lại của ngân sách Ăn uống tháng này \(800\.000 ₫\)/),
    ).toBeInTheDocument();
  });

  it('hides the budget sentence when there is no food budget', async () => {
    renderList('/recipes/list/ga-kho', { budget: null });
    const dock = await screen.findByRole('complementary', { name: 'Bảng bên phải' });
    await within(dock).findByText('30.500 ₫');
    expect(within(dock).queryByText(/ngân sách Ăn uống/)).not.toBeInTheDocument();
  });

  it('lists the dishes planned this week', async () => {
    const backend = new RecipesBackend();
    backend.seedPlan('2026-10-10', 'lunch', 'ga-kho');
    renderList('/recipes/list/ga-kho', { backend });
    const dock = await screen.findByRole('complementary', { name: 'Bảng bên phải' });
    expect(await within(dock).findByText('Trong thực đơn tuần (1)')).toBeInTheDocument();
    expect(within(dock).getByText('T7 10/10 · Trưa')).toBeInTheDocument();
  });

  it('saves notes only after a change', async () => {
    const view = renderList();
    const user = userEvent.setup();
    const save = await screen.findByRole('button', { name: 'Lưu ghi chú' });
    expect(save).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: 'Ghi chú' }), 'ít đường');
    await user.click(save);
    const [update] = view.engine.callsTo('recipes.update') as { id: string; note: string; name: string }[];
    expect(update).toMatchObject({ id: 'ga-kho', note: 'ít đường', name: 'Gà kho gừng' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu ghi chú' })).toBeDisabled());
  });

  it('deletes after a confirmation', async () => {
    const view = renderList();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Xoá công thức' }));
    expect(view.engine.callsTo('recipes.delete')).toHaveLength(0);
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Xoá' }));
    expect(view.engine.callsTo('recipes.delete')).toEqual([{ id: 'ga-kho' }]);
    await waitFor(() => expect(location()).toHaveTextContent('/recipes/list'));
  });

  it('opens the editor for the recipe', async () => {
    renderList();
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Sửa công thức' }));
    expect(location()).toHaveTextContent('/recipes/edit/ga-kho');
  });
});

describe('narrow layout', () => {
  it('shows the list first without picking a recipe', async () => {
    const view = renderList('/recipes/list', { width: 390 });
    expect(await screen.findByRole('list', { name: 'Danh sách công thức' })).toBeInTheDocument();
    expect(location()).toHaveTextContent(/^\/recipes\/list$/);
    await waitFor(() => expect(view.described.at(-1)?.narrowShows).toBe('list'));
  });

  it('shows the detail on its own with a back button and the dock content inline', async () => {
    const view = renderList('/recipes/list/ga-kho', { width: 390 });
    const user = userEvent.setup();
    expect(await screen.findByRole('heading', { name: 'Gà kho gừng' })).toBeInTheDocument();
    await waitFor(() => expect(view.described.at(-1)).toMatchObject({ narrowShows: 'main', hasDock: false }));
    expect(screen.queryByRole('complementary', { name: 'Bảng bên phải' })).toBeEmptyDOMElement();
    expect(await screen.findByText('Chi phí ước tính')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Quay lại danh sách' }));
    expect(location()).toHaveTextContent(/^\/recipes\/list$/);
  });
});
