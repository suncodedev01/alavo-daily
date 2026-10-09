import { screen } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';

import { RecipeEditorScreen } from '../editor/components/RecipeEditorScreen';
import { renderScreen } from './renderScreen';

export const location = () => screen.getByLabelText('Đường dẫn hiện tại');

export function renderEditor(route = '/recipes/new', options: Partial<Parameters<typeof renderScreen>[1]> = {}) {
  return renderScreen(<RecipeEditorScreen />, { path: '/recipes/new', route, ...options });
}

export function renderEdit(id = 'ga-kho') {
  return renderScreen(<RecipeEditorScreen />, { path: '/recipes/edit/:id', route: `/recipes/edit/${id}` });
}

export async function fillMinimalRecipe(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('textbox', { name: 'Tên món' }), 'Bò kho');
  await user.type(screen.getByRole('textbox', { name: 'Tên nguyên liệu' }), 'Bắp bò');
  await user.type(screen.getByRole('textbox', { name: 'Số lượng' }), '0,5');
  await user.type(screen.getByRole('textbox', { name: 'Bước 1' }), 'Ướp bò');
}
