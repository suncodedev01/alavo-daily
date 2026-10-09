import { EngineCallError } from '@alavo-daily/common/engine';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { readPhoto } from '../../photo/logic/browserImage';
import { PhotoTooLarge } from '../../photo/logic/photoSize';
import { renderEdit, renderEditor, fillMinimalRecipe, location } from '../../testing/editorScreens';
import { RecipesBackend } from '../../testing/fakeBackend';
import { renderScreen } from '../../testing/renderScreen';
import { RecipeEditorScreen } from './RecipeEditorScreen';

vi.mock('../../photo/logic/browserImage', () => ({ readPhoto: vi.fn() }));

const PHOTO = 'data:image/jpeg;base64,AAAA';

afterEach(() => {
  vi.mocked(readPhoto).mockReset();
});

describe('recipe photo', () => {
  const file = () => new File(['x'], 'bo-kho.png', { type: 'image/png' });
  const fileInput = () => screen.getByLabelText('Chọn tệp ảnh');

  it('offers an enabled button to add a photo and no preview at first', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: 'Thêm ảnh' })).toBeEnabled();
    expect(screen.queryByRole('img', { name: 'Ảnh xem trước' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xoá ảnh' })).not.toBeInTheDocument();
  });

  it('keeps the real file input hidden and opens it from the button', async () => {
    renderEditor();
    expect(fileInput()).not.toBeVisible();
    const opened = vi.spyOn(fileInput() as HTMLInputElement, 'click');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thêm ảnh' }));
    expect(opened).toHaveBeenCalled();
  });

  it('shows a preview of the resized photo with a remove button', async () => {
    vi.mocked(readPhoto).mockResolvedValue(PHOTO);
    renderEditor();
    await userEvent.setup().upload(fileInput(), file());
    expect(await screen.findByRole('img', { name: 'Ảnh xem trước' })).toHaveAttribute('src', PHOTO);
    expect(readPhoto).toHaveBeenCalledWith(expect.objectContaining({ name: 'bo-kho.png' }));
    expect(screen.getByRole('button', { name: 'Đổi ảnh' })).toBeInTheDocument();
  });

  it('removes the photo from the form', async () => {
    vi.mocked(readPhoto).mockResolvedValue(PHOTO);
    renderEditor();
    const user = userEvent.setup();
    await user.upload(fileInput(), file());
    await user.click(await screen.findByRole('button', { name: 'Xoá ảnh' }));
    expect(screen.queryByRole('img', { name: 'Ảnh xem trước' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm ảnh' })).toBeInTheDocument();
  });

  it('says so when the photo cannot be read or is too large and keeps the form usable', async () => {
    vi.mocked(readPhoto).mockRejectedValueOnce(new Error('broken')).mockRejectedValueOnce(new PhotoTooLarge());
    renderEditor();
    const user = userEvent.setup();
    await user.upload(fileInput(), file());
    expect(await screen.findByRole('alert')).toHaveTextContent('Không đọc được ảnh này');
    await user.upload(fileInput(), file());
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Ảnh này quá lớn'));
    expect(screen.getByRole('button', { name: 'Thêm ảnh' })).toBeEnabled();
  });

  it('saves a new recipe and then its photo, without putting the photo in the recipe', async () => {
    vi.mocked(readPhoto).mockResolvedValue(PHOTO);
    const view = renderEditor();
    const user = userEvent.setup();
    await fillMinimalRecipe(user);
    await user.upload(fileInput(), file());
    await screen.findByRole('img', { name: 'Ảnh xem trước' });
    await user.click(screen.getByRole('button', { name: 'Lưu công thức' }));
    await waitFor(() => expect(location()).toHaveTextContent('/recipes/list/new-1'));
    expect(view.engine.callsTo('recipes.set_photo')).toEqual([{ id: 'new-1', dataUrl: PHOTO }]);
    expect(view.engine.callsTo('recipes.create')[0]).not.toHaveProperty('photo');
  });

  it('does not touch the photo of a recipe it did not change', async () => {
    const view = renderEdit();
    const name = await screen.findByRole('textbox', { name: 'Tên món' });
    const user = userEvent.setup();
    await user.type(name, ' ngon');
    await user.click(screen.getByRole('button', { name: 'Lưu công thức' }));
    await waitFor(() => expect(location()).toHaveTextContent('/recipes/list/ga-kho'));
    expect(view.engine.callsTo('recipes.set_photo')).toEqual([]);
  });

  it('loads the stored photo when editing and removes it on save', async () => {
    const backend = new RecipesBackend();
    backend.setPhoto('ga-kho', PHOTO);
    const view = renderScreen(<RecipeEditorScreen />, {
      path: '/recipes/edit/:id',
      route: '/recipes/edit/ga-kho',
      backend,
    });
    const user = userEvent.setup();
    expect(await screen.findByRole('img', { name: 'Ảnh xem trước' })).toHaveAttribute('src', PHOTO);
    await user.click(screen.getByRole('button', { name: 'Xoá ảnh' }));
    await user.click(screen.getByRole('button', { name: 'Lưu công thức' }));
    await waitFor(() => expect(location()).toHaveTextContent('/recipes/list/ga-kho'));
    expect(view.engine.callsTo('recipes.set_photo')).toEqual([{ id: 'ga-kho', dataUrl: null }]);
  });

  it('still saves the recipe and tells the person when only the photo fails', async () => {
    vi.mocked(readPhoto).mockResolvedValue(PHOTO);
    renderEditor('/recipes/new', {
      handlers: {
        'recipes.set_photo': () => {
          throw new EngineCallError('validation', 'photo is larger than 400 KB');
        },
      },
    });
    const user = userEvent.setup();
    await fillMinimalRecipe(user);
    await user.upload(fileInput(), file());
    await screen.findByRole('img', { name: 'Ảnh xem trước' });
    await user.click(screen.getByRole('button', { name: 'Lưu công thức' }));
    await waitFor(() => expect(location()).toHaveTextContent('/recipes/list/new-1'));
    expect(await screen.findByText(/nhưng chưa lưu được ảnh/)).toBeInTheDocument();
  });
});
