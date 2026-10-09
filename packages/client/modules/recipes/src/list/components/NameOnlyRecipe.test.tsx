import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { RecipesBackend } from '../../testing/fakeBackend';
import { recipe } from '../../testing/fixtures';
import { renderScreen } from '../../testing/renderScreen';
import { RecipeListScreen } from './RecipeListScreen';

const BARE = recipe({ id: 'bare', name: 'Cơm trắng', prepMin: 0, cookMin: 0 });

const location = () => screen.getByLabelText('Đường dẫn hiện tại');

function renderBare() {
  return renderScreen(<RecipeListScreen />, {
    path: '/recipes/list/:id?',
    route: '/recipes/list/bare',
    backend: new RecipesBackend([BARE]),
  });
}

describe('a recipe with only a name', () => {
  it('shows in the list without a time or a cost', async () => {
    renderBare();
    const list = await screen.findByRole('list', { name: 'Danh sách công thức' });
    const row = within(list).getByRole('link', { name: /Cơm trắng/ });
    expect(row).toHaveAccessibleName('Cơm trắngDễ');
    expect(row).not.toHaveTextContent('0 phút');
    expect(row).not.toHaveTextContent('NaN');
  });

  it('shows calm empty parts with a way to add them', async () => {
    renderBare();
    await screen.findByRole('heading', { name: 'Cơm trắng' });
    expect(screen.getByText('Món này chưa có nguyên liệu.')).toBeInTheDocument();
    expect(screen.getByText('Món này chưa có các bước nấu.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Nguyên liệu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Các bước' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('opens the editor from the empty ingredients part', async () => {
    renderBare();
    await screen.findByRole('heading', { name: 'Cơm trắng' });
    const main = within(screen.getByRole('main'));
    await userEvent.setup().click(main.getByRole('button', { name: 'Thêm nguyên liệu' }));
    expect(location()).toHaveTextContent('/recipes/edit/bare');
  });

  it('opens the editor from the empty steps part', async () => {
    renderBare();
    await screen.findByRole('heading', { name: 'Cơm trắng' });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thêm các bước' }));
    expect(location()).toHaveTextContent('/recipes/edit/bare');
  });

  it('still changes the servings and says there is no cost estimate', async () => {
    renderBare();
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Cơm trắng' });
    await user.click(screen.getByRole('button', { name: 'Tăng khẩu phần' }));
    expect(await screen.findByText('Chưa có chi phí ước tính cho món này.')).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it('tells the person there is nothing to add to the shopping list', async () => {
    const view = renderBare();
    await screen.findByRole('heading', { name: 'Cơm trắng' });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thêm vào đi chợ' }));
    expect(await screen.findByText(/chưa có nguyên liệu để thêm/)).toBeInTheDocument();
    expect(view.engine.callsTo('recipes.add_shopping_item')).toEqual([]);
  });
});
