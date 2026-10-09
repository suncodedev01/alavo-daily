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

async function openSuggestions(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('button', { name: 'Gợi ý thực đơn' });
  await user.click(screen.getByRole('button', { name: 'Gợi ý thực đơn' }));
  return screen.findByRole('dialog', { name: 'Gợi ý thực đơn' });
}

describe('weekly suggestion', () => {
  it('puts the button in the screen header on a wide layout', async () => {
    renderPlan();
    await screen.findByRole('table', { name: 'Thực đơn cả tuần' });
    expect(within(screen.getByRole('banner')).getByRole('button', { name: 'Gợi ý thực đơn' })).toBeInTheDocument();
  });

  it('asks for lunch and dinner from today to the end of the week and lists the meals by day', async () => {
    const view = renderPlan();
    const dialog = await openSuggestions(userEvent.setup());
    expect(await within(dialog).findByRole('heading', { name: 'Hôm nay · 9/10' })).toBeInTheDocument();
    expect(view.engine.callsTo('recipes.suggest_plan')).toEqual([
      { from: '2026-10-09', days: 3, slots: ['lunch', 'dinner'], seed: 0 },
    ]);
    const today = within(dialog).getByRole('list', { name: 'Món gợi ý ngày 9/10' });
    expect(within(today).getAllByRole('listitem')).toHaveLength(1);
    expect(within(today).getByText('Gà kho gừng')).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Thứ Bảy · 10/10' })).toBeInTheDocument();
    expect(within(dialog).getByText('4 món')).toBeInTheDocument();
  });

  it('does not save anything while the person is only looking', async () => {
    const view = renderPlan();
    const dialog = await openSuggestions(userEvent.setup());
    await within(dialog).findByText('4 món');
    expect(view.engine.callsTo('recipes.add_to_plan')).toEqual([]);
    expect(view.backend.plan).toHaveLength(4);
  });

  it('changes the meals to fill and never allows none', async () => {
    const view = renderPlan();
    const user = userEvent.setup();
    const dialog = await openSuggestions(user);
    await within(dialog).findByText('4 món');
    await user.click(within(dialog).getByRole('button', { name: 'Sáng' }));
    await waitFor(() =>
      expect(view.engine.callsTo('recipes.suggest_plan')).toContainEqual({
        from: '2026-10-09',
        days: 3,
        slots: ['breakfast', 'lunch', 'dinner'],
        seed: 0,
      }),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Trưa' }));
    await user.click(within(dialog).getByRole('button', { name: 'Tối' }));
    await user.click(within(dialog).getByRole('button', { name: 'Sáng' }));
    expect(within(dialog).getByRole('button', { name: 'Sáng' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('replaces one dish with another and tells the engine what else is proposed', async () => {
    const view = renderPlan();
    const user = userEvent.setup();
    const dialog = await openSuggestions(user);
    const saturday = await within(dialog).findByRole('list', { name: 'Món gợi ý ngày 10/10' });
    expect(within(saturday).getByText('Canh chua cá lóc')).toBeInTheDocument();
    await user.click(within(saturday).getByRole('button', { name: 'Đổi món bữa Tối ngày 10/10' }));
    expect(await within(saturday).findByText('Rau muống xào tỏi')).toBeInTheDocument();
    expect(within(saturday).queryByText('Canh chua cá lóc')).not.toBeInTheDocument();
    const [reroll] = view.engine.callsTo('recipes.suggest_plan').slice(-1) as Record<string, unknown>[];
    expect(reroll).toMatchObject({ from: '2026-10-10', days: 1, slots: ['dinner'], seed: 1, avoid: ['canh-chua'] });
    expect(reroll?.alsoPlanned).toHaveLength(3);
    expect(within(dialog).getByText('4 món')).toBeInTheDocument();
  });

  it('uses a new seed for every re-roll', async () => {
    const view = renderPlan();
    const user = userEvent.setup();
    const dialog = await openSuggestions(user);
    await user.click(await within(dialog).findByRole('button', { name: 'Đổi món bữa Tối ngày 10/10' }));
    await waitFor(() => expect(view.engine.callsTo('recipes.suggest_plan')).toHaveLength(2));
    await user.click(await within(dialog).findByRole('button', { name: 'Đổi món bữa Tối ngày 10/10' }));
    await waitFor(() => expect(view.engine.callsTo('recipes.suggest_plan')).toHaveLength(3));
    const requests = view.engine.callsTo('recipes.suggest_plan') as { seed: number; days: number }[];
    expect(requests.filter((request) => request.days === 1).map((request) => request.seed)).toEqual([1, 2]);
  });

  it('drops a meal from the proposal', async () => {
    const view = renderPlan();
    const user = userEvent.setup();
    const dialog = await openSuggestions(user);
    await user.click(await within(dialog).findByRole('button', { name: 'Bỏ bữa Trưa ngày 9/10 khỏi gợi ý' }));
    expect(within(dialog).queryByRole('list', { name: 'Món gợi ý ngày 9/10' })).not.toBeInTheDocument();
    expect(within(dialog).getByText('3 món')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Áp dụng' }));
    await waitFor(() => expect(view.engine.callsTo('recipes.add_to_plan')).toHaveLength(3));
  });

  it('cannot apply once every meal was dropped', async () => {
    const user = userEvent.setup();
    renderPlan('/recipes/plan', { handlers: { 'recipes.suggest_plan': () => [PROPOSED] } });
    const dialog = await openSuggestions(user);
    await user.click(await within(dialog).findByRole('button', { name: /^Bỏ bữa Trưa/ }));
    expect(within(dialog).getByText('Bạn đã bỏ hết món gợi ý.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Áp dụng' })).toBeDisabled();
  });

  it('asks for a whole new proposal with another seed', async () => {
    const view = renderPlan();
    const user = userEvent.setup();
    const dialog = await openSuggestions(user);
    await user.click(await within(dialog).findByRole('button', { name: 'Gợi ý lại tất cả' }));
    await waitFor(() =>
      expect(view.engine.callsTo('recipes.suggest_plan')).toContainEqual({
        from: '2026-10-09',
        days: 3,
        slots: ['lunch', 'dinner'],
        seed: 1,
      }),
    );
  });

  it('applies the whole proposal through add_to_plan with the household servings and closes', async () => {
    const view = renderPlan();
    const user = userEvent.setup();
    const dialog = await openSuggestions(user);
    await within(dialog).findByText('4 món');
    await user.click(within(dialog).getByRole('button', { name: 'Áp dụng' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(view.engine.callsTo('recipes.add_to_plan')).toEqual([
      { date: '2026-10-09', slot: 'lunch', recipeId: 'ga-kho', servings: 2 },
      { date: '2026-10-10', slot: 'dinner', recipeId: 'canh-chua', servings: 2 },
      { date: '2026-10-11', slot: 'lunch', recipeId: 'rau-muong', servings: 2 },
      { date: '2026-10-11', slot: 'dinner', recipeId: 'ga-kho', servings: 2 },
    ]);
    expect(await screen.findByText('Đã thêm 4 món vào thực đơn')).toBeInTheDocument();
    expect(view.backend.plan).toHaveLength(8);
  });

  it('reports a failure while applying and keeps the dialog open', async () => {
    renderPlan('/recipes/plan', {
      handlers: {
        'recipes.add_to_plan': () => {
          throw new EngineCallError('internal', 'boom');
        },
      },
    });
    const user = userEvent.setup();
    const dialog = await openSuggestions(user);
    await within(dialog).findByText('4 món');
    await user.click(within(dialog).getByRole('button', { name: 'Áp dụng' }));
    expect(await screen.findByText('Không thực hiện được. Bạn thử lại sau nhé.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Gợi ý thực đơn' })).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Áp dụng' })).toBeEnabled());
  });

  it('says so when the chosen meals already have dishes', async () => {
    renderPlan('/recipes/plan', { handlers: { 'recipes.suggest_plan': () => [] } });
    const dialog = await openSuggestions(userEvent.setup());
    expect(await within(dialog).findByText('Các bữa bạn chọn trong khoảng này đã có món rồi.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Áp dụng' })).not.toBeInTheDocument();
  });

  it('asks for recipes first when there are none', async () => {
    renderPlan('/recipes/plan', { backend: new RecipesBackend([]) });
    const dialog = await openSuggestions(userEvent.setup());
    expect(
      await within(dialog).findByText('Chưa có công thức nào để gợi ý. Hãy thêm công thức trước nhé.'),
    ).toBeInTheDocument();
  });

  it('shows the error with a retry when the engine fails', async () => {
    let attempts = 0;
    renderPlan('/recipes/plan', {
      handlers: {
        'recipes.suggest_plan': () => {
          attempts += 1;
          if (attempts === 1) throw new EngineCallError('internal', 'boom');
          return [];
        },
      },
    });
    const user = userEvent.setup();
    const dialog = await openSuggestions(user);
    await user.click(await within(dialog).findByRole('button', { name: 'Thử lại' }));
    expect(await within(dialog).findByText(/đã có món rồi/)).toBeInTheDocument();
  });

  it('starts from the first day of a week that is not this one', async () => {
    const view = renderPlan('/recipes/plan?week=2026-10-12');
    await openSuggestions(userEvent.setup());
    await waitFor(() =>
      expect(view.engine.callsTo('recipes.suggest_plan')).toContainEqual({
        from: '2026-10-12',
        days: 7,
        slots: ['lunch', 'dinner'],
        seed: 0,
      }),
    );
  });

  it('works on a narrow layout with the button in the page and the proposal in a sheet', async () => {
    const view = renderPlan('/recipes/plan', { width: 390 });
    const user = userEvent.setup();
    await screen.findByRole('group', { name: 'Chọn ngày' });
    expect(within(screen.getByRole('banner')).queryByRole('button', { name: 'Gợi ý thực đơn' })).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('main')).getByRole('button', { name: 'Gợi ý thực đơn' }));
    const dialog = await screen.findByRole('dialog', { name: 'Gợi ý thực đơn' });
    await within(dialog).findByText('4 món');
    await user.click(within(dialog).getByRole('button', { name: 'Áp dụng' }));
    await waitFor(() => expect(view.engine.callsTo('recipes.add_to_plan')).toHaveLength(4));
  });
});

const PROPOSED = {
  date: '2026-10-09',
  slot: 'lunch' as const,
  recipeId: 'ga-kho',
  recipeName: 'Gà kho gừng',
  recipeIcon: 'cooking-pot',
};
