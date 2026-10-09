import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RecipesBackend } from '../../testing/fakeBackend';
import { renderScreen } from '../../testing/renderScreen';
import { TodayMealsGroup } from './TodayMealsGroup';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 9, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

function renderGroup(backend = new RecipesBackend(), handlers = {}) {
  return renderScreen(<TodayMealsGroup />, { path: '/', route: '/', backend, handlers, fullscreen: true });
}

describe('TodayMealsGroup', () => {
  it('lists the dishes planned for today with their meal', async () => {
    const backend = new RecipesBackend();
    backend.seedPlan('2026-10-09', 'lunch', 'canh-chua');
    backend.seedPlan('2026-10-09', 'dinner', 'ga-kho');
    backend.seedPlan('2026-10-10', 'dinner', 'rau-muong');
    renderGroup(backend);
    expect(await screen.findByText('Hôm nay ăn gì')).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(within(links[0]!).getByText('Canh chua cá lóc')).toBeInTheDocument();
    expect(within(links[0]!).getByText('Trưa')).toBeInTheDocument();
    expect(links[1]).toHaveAccessibleName(/Gà kho gừng/);
  });

  it('opens the recipe of a dish', async () => {
    const backend = new RecipesBackend();
    backend.seedPlan('2026-10-09', 'dinner', 'ga-kho');
    renderGroup(backend);
    await userEvent.setup().click(await screen.findByRole('link', { name: /Gà kho gừng/ }));
    expect(screen.getByLabelText('Đường dẫn hiện tại')).toHaveTextContent('/recipes/list/ga-kho');
  });

  it('says so when nothing is planned for today', async () => {
    renderGroup();
    expect(await screen.findByText('Chưa lên món cho hôm nay.')).toBeInTheDocument();
  });

  it('shows nothing while loading or when the plan cannot be read', () => {
    renderGroup(new RecipesBackend(), { 'recipes.get_plan': () => new Promise(() => undefined) });
    expect(screen.queryByText('Hôm nay ăn gì')).not.toBeInTheDocument();
  });
});
