import type { RecipeInput } from '@alavo-daily/common/engine';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderEdit, renderEditor, fillMinimalRecipe } from '../../testing/editorScreens';

describe('estimated cost', () => {
  async function typeCost(user: ReturnType<typeof userEvent.setup>, text: string) {
    await user.type(screen.getAllByRole('textbox', { name: 'Giá ước tính' })[0]!, text);
  }

  it('formats the price as the person types and sends whole đồng to the engine', async () => {
    const view = renderEditor();
    const user = userEvent.setup();
    await fillMinimalRecipe(user);
    await typeCost(user, '54000');
    expect(screen.getByRole('textbox', { name: 'Giá ước tính' })).toHaveValue('54.000');
    await user.click(screen.getByRole('button', { name: 'Lưu công thức' }));
    const [payload] = view.engine.callsTo('recipes.create') as RecipeInput[];
    expect(payload?.ingredients[0]?.costVnd).toBe(54000);
  });

  it('shows the total and the cost per serving in the dock and follows the servings', async () => {
    renderEditor();
    const user = userEvent.setup();
    await fillMinimalRecipe(user);
    await typeCost(user, '60000');
    const dock = screen.getByRole('complementary', { name: 'Bảng bên phải' });
    expect(within(dock).getByText('60.000 ₫')).toBeInTheDocument();
    expect(within(dock).getByText('cho 2 người · 30.000 ₫ mỗi người')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tăng khẩu phần' }));
    expect(within(dock).getByText('cho 3 người · 20.000 ₫ mỗi người')).toBeInTheDocument();
  });

  it('asks for prices while none is typed', () => {
    renderEditor();
    const dock = screen.getByRole('complementary', { name: 'Bảng bên phải' });
    expect(within(dock).getByText('Nhập giá ước tính của từng nguyên liệu để xem tổng chi phí.')).toBeInTheDocument();
  });

  it('loads the stored prices when editing and adds them up', async () => {
    renderEdit();
    const dock = screen.getByRole('complementary', { name: 'Bảng bên phải' });
    expect(await within(dock).findByText('61.000 ₫')).toBeInTheDocument();
    expect(within(dock).getByText('cho 4 người · 15.250 ₫ mỗi người')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox', { name: 'Giá ước tính' })[0]).toHaveValue('54.000');
  });

  it('shows the same summary in the page on a narrow layout', async () => {
    renderEditor('/recipes/new', { width: 390 });
    const user = userEvent.setup();
    await fillMinimalRecipe(user);
    await typeCost(user, '10000');
    const main = within(screen.getByRole('main'));
    expect(main.getByRole('heading', { name: 'Chi phí ước tính' })).toBeInTheDocument();
    expect(main.getByText('10.000 ₫')).toBeInTheDocument();
  });

  it('does not count a row that has a price but no name', async () => {
    renderEditor();
    const user = userEvent.setup();
    await typeCost(user, '99000');
    const dock = screen.getByRole('complementary', { name: 'Bảng bên phải' });
    expect(within(dock).queryByText('99.000 ₫')).not.toBeInTheDocument();
  });
});
