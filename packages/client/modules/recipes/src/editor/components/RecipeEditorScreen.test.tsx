import { EngineCallError, type RecipeInput } from '@alavo-daily/common/engine';
import { createFakePlatform } from '@alavo-daily/common/testing';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderEdit, renderEditor, fillMinimalRecipe, location } from '../../testing/editorScreens';

const IMPORT_CAPABILITIES = { backgroundReminders: false, keepAwake: true, importFromUrl: true, googleSync: true };

const IMPORTED: RecipeInput = {
  name: 'Bò kho bánh mì',
  tags: ['Món chính'],
  prepMin: 20,
  cookMin: 90,
  servings: 4,
  ingredients: [{ name: 'Bắp bò', quantity: 500, unit: 'g', aisle: 'meat_fish' }],
  steps: [{ text: 'Ướp bò với gia vị', timerMin: 30 }],
};

describe('new recipe form', () => {
  it('starts empty with the checklist unfinished and saving disabled', () => {
    renderEditor();
    const checklist = screen.getByRole('list', { name: 'Kiểm tra trước khi lưu' });
    expect(within(checklist).getAllByText('Chưa xong')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Lưu công thức' })).toBeDisabled();
    expect(screen.getByText('Còn thiếu thông tin bắt buộc.')).toBeInTheDocument();
  });

  it('ticks the checklist as the required fields are filled', async () => {
    renderEditor();
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: 'Tên món' }), 'Bò kho');
    const checklist = screen.getByRole('list', { name: 'Kiểm tra trước khi lưu' });
    expect(within(checklist).getAllByText('Chưa xong')).toHaveLength(2);
    await fillMinimalRecipe(userEvent.setup());
    expect(within(checklist).queryByText('Chưa xong')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu công thức' })).toBeEnabled();
    expect(screen.getByText('Sẵn sàng để lưu.')).toBeInTheDocument();
  });

  it('creates the recipe with the shape the engine expects and opens it', async () => {
    const view = renderEditor();
    const user = userEvent.setup();
    await fillMinimalRecipe(user);
    await user.type(screen.getByRole('textbox', { name: 'Phút chuẩn bị' }), '20');
    await user.type(screen.getByRole('textbox', { name: 'Phút nấu' }), '90');
    await user.click(screen.getByRole('button', { name: 'Tăng khẩu phần' }));
    await user.click(screen.getByRole('button', { name: 'Canh' }));
    await user.click(screen.getByRole('button', { name: 'Thêm hẹn giờ' }));
    await user.click(screen.getByRole('button', { name: 'Lưu công thức' }));
    expect(view.engine.callsTo('recipes.create')).toEqual([
      {
        name: 'Bò kho',
        tags: ['Món chính', 'Canh'],
        prepMin: 20,
        cookMin: 90,
        servings: 3,
        level: 'medium',
        icon: 'cooking-pot',
        kcal: null,
        note: '',
        ingredients: [{ name: 'Bắp bò', quantity: 0.5, unit: 'g', aisle: 'other', costVnd: 0 }],
        steps: [{ text: 'Ướp bò', timerMin: 10 }],
      },
    ]);
    await waitFor(() => expect(location()).toHaveTextContent('/recipes/list/new-1'));
  });

  it('shows the engine validation error in Vietnamese and stays on the form', async () => {
    renderEditor('/recipes/new', {
      handlers: {
        'recipes.create': () => {
          throw new EngineCallError('validation', 'quantity of Bắp bò must be above 0');
        },
      },
    });
    const user = userEvent.setup();
    await fillMinimalRecipe(user);
    await user.click(screen.getByRole('button', { name: 'Lưu công thức' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Số lượng của Bắp bò phải lớn hơn 0.');
    expect(location()).toHaveTextContent('/recipes/new');
  });

  it('cancels back to the list', async () => {
    renderEditor();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(location()).toHaveTextContent('/recipes/list');
  });

});

describe('ingredient rows', () => {
  it('adds and removes rows, and keeps one blank row at the end', async () => {
    renderEditor();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Thêm nguyên liệu' }));
    expect(screen.getAllByRole('textbox', { name: 'Tên nguyên liệu' })).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: 'Xoá nguyên liệu' })[0]!);
    await user.click(screen.getAllByRole('button', { name: 'Xoá nguyên liệu' })[0]!);
    expect(screen.getAllByRole('textbox', { name: 'Tên nguyên liệu' })).toHaveLength(1);
  });

  it('picks the unit and the aisle from custom pickers', async () => {
    const view = renderEditor();
    const user = userEvent.setup();
    await fillMinimalRecipe(user);
    await user.click(screen.getByRole('button', { name: 'Đơn vị: g' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'muỗng canh' }));
    await user.click(screen.getByRole('button', { name: 'Mua ở khu nào: Khác' }));
    expect(await screen.findAllByRole('menuitemradio')).toHaveLength(4);
    await user.click(screen.getByRole('menuitemradio', { name: 'Gia vị' }));
    await user.click(screen.getByRole('button', { name: 'Lưu công thức' }));
    const [payload] = view.engine.callsTo('recipes.create') as RecipeInput[];
    expect(payload?.ingredients[0]).toMatchObject({ unit: 'muỗng canh', aisle: 'spices' });
  });

  it('offers a good list of units', async () => {
    renderEditor();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Đơn vị: g' }));
    const units = (await screen.findAllByRole('menuitemradio')).map((item) => item.textContent);
    expect(units).toEqual(expect.arrayContaining(['g', 'kg', 'ml', 'lít', 'củ', 'tép', 'muỗng canh', 'muỗng cà phê']));
  });
});

describe('step rows', () => {
  async function twoSteps() {
    const view = renderEditor();
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: 'Bước 1' }), 'Một');
    await user.click(screen.getByRole('button', { name: 'Thêm bước' }));
    await user.type(screen.getByRole('textbox', { name: 'Bước 2' }), 'Hai');
    return { view, user };
  }

  it('moves a step up and down', async () => {
    const { user } = await twoSteps();
    await user.click(screen.getByRole('button', { name: 'Chuyển bước 2 lên' }));
    expect(screen.getByRole('textbox', { name: 'Bước 1' })).toHaveValue('Hai');
    expect(screen.getByRole('textbox', { name: 'Bước 2' })).toHaveValue('Một');
    await user.click(screen.getByRole('button', { name: 'Chuyển bước 1 xuống' }));
    expect(screen.getByRole('textbox', { name: 'Bước 1' })).toHaveValue('Một');
  });

  it('cannot move the first step up or the last one down', async () => {
    await twoSteps();
    expect(screen.getByRole('button', { name: 'Chuyển bước 1 lên' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Chuyển bước 2 xuống' })).toBeDisabled();
  });

  it('deletes a step', async () => {
    const { user } = await twoSteps();
    await user.click(screen.getByRole('button', { name: 'Xoá bước 1' }));
    expect(screen.getAllByRole('textbox', { name: /^Bước/ })).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'Bước 1' })).toHaveValue('Hai');
  });

  it('adds, changes and removes a timer', async () => {
    const { user } = await twoSteps();
    await user.click(screen.getAllByRole('button', { name: 'Thêm hẹn giờ' })[0]!);
    const minutes = screen.getByRole('textbox', { name: 'Phút hẹn giờ' });
    expect(minutes).toHaveValue('10');
    await user.clear(minutes);
    await user.type(minutes, '25');
    expect(screen.getByRole('textbox', { name: 'Phút hẹn giờ' })).toHaveValue('25');
    expect(screen.getByText(/1 bước có hẹn giờ/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bỏ hẹn giờ' }));
    expect(screen.queryByRole('textbox', { name: 'Phút hẹn giờ' })).not.toBeInTheDocument();
  });
});

describe('import entry', () => {
  it('only offers typing by hand on a platform that cannot fetch pages', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: 'Tự nhập' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Dán link' })).not.toBeInTheDocument();
  });

  it('fills the form from the JSON-LD of a page when the platform can fetch', async () => {
    const html = `<script type="application/ld+json">{"@type":"Recipe"}</script>`;
    const fetchPage = vi.fn(async () => html);
    const parse = vi.fn(() => IMPORTED);
    const platform = createFakePlatform({ capabilities: IMPORT_CAPABILITIES, fetchPage });
    renderEditor('/recipes/new', { platform, handlers: { 'recipes.parse_json_ld': parse } });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Dán link' }));
    await user.type(screen.getByRole('textbox', { name: 'Đường dẫn công thức' }), 'https://example.com/bo-kho');
    await user.click(screen.getByRole('button', { name: 'Nhập công thức' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Tên món' })).toHaveValue('Bò kho bánh mì'));
    expect(fetchPage).toHaveBeenCalledWith('https://example.com/bo-kho');
    expect(parse).toHaveBeenCalledWith({ json: '{"@type":"Recipe"}' });
    expect(screen.getByText('Đã đọc công thức.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Bước 1' })).toHaveValue('Ướp bò với gia vị');
  });

  it('explains when the page cannot be fetched', async () => {
    const fetchPage = vi.fn(async () => Promise.reject(new TypeError('network')));
    const platform = createFakePlatform({ capabilities: IMPORT_CAPABILITIES, fetchPage });
    renderEditor('/recipes/new', { platform });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Dán link' }));
    await user.type(screen.getByRole('textbox', { name: 'Đường dẫn công thức' }), 'https://example.com');
    await user.click(screen.getByRole('button', { name: 'Nhập công thức' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được trang này');
    expect(screen.getByRole('textbox', { name: 'Đường dẫn công thức' })).toHaveValue('https://example.com');
  });

  it('explains when the address is not a web address without fetching', async () => {
    const fetchPage = vi.fn(async () => '');
    const platform = createFakePlatform({ capabilities: IMPORT_CAPABILITIES, fetchPage });
    renderEditor('/recipes/new', { platform });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Dán link' }));
    await user.type(screen.getByRole('textbox', { name: 'Đường dẫn công thức' }), 'bò kho');
    await user.click(screen.getByRole('button', { name: 'Nhập công thức' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Đường dẫn này chưa đúng');
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('finds the recipe inside an @graph list of the page', async () => {
    const graph = '{"@graph":[{"@type":"WebPage"},{"@type":"Recipe","name":"Bò kho"}]}';
    const html = `<script type="application/ld+json">${graph}</script>`;
    const platform = createFakePlatform({ capabilities: IMPORT_CAPABILITIES, fetchPage: async () => html });
    const parse = vi.fn(() => IMPORTED);
    renderEditor('/recipes/new', { platform, handlers: { 'recipes.parse_json_ld': parse } });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Dán link' }));
    await user.type(screen.getByRole('textbox', { name: 'Đường dẫn công thức' }), 'https://example.com/bo-kho');
    await user.click(screen.getByRole('button', { name: 'Nhập công thức' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Tên món' })).toHaveValue('Bò kho bánh mì'));
    expect(parse).toHaveBeenCalledWith({ json: '{"@type":"Recipe","name":"Bò kho"}' });
  });

  it('explains when the page holds no recipe', async () => {
    const platform = createFakePlatform({
      capabilities: IMPORT_CAPABILITIES,
      fetchPage: async () => '<p>no data</p>',
    });
    renderEditor('/recipes/new', { platform });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Dán link' }));
    await user.type(screen.getByRole('textbox', { name: 'Đường dẫn công thức' }), 'https://example.com');
    await user.click(screen.getByRole('button', { name: 'Nhập công thức' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('không có công thức');
  });
});

describe('JSON-LD box', () => {
  async function openBox(handlers: Parameters<typeof renderEditor>[1] = {}) {
    const view = renderEditor('/recipes/new', handlers);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Dán JSON-LD (nâng cao)' }));
    return { view, user };
  }

  function paste(text: string) {
    fireEvent.change(screen.getByRole('textbox', { name: 'Nội dung JSON-LD' }), { target: { value: text } });
  }

  it('is collapsed until asked for', () => {
    renderEditor();
    expect(screen.queryByRole('textbox', { name: 'Nội dung JSON-LD' })).not.toBeInTheDocument();
  });

  it('fills the form from pasted JSON-LD', async () => {
    const { user } = await openBox({ handlers: { 'recipes.parse_json_ld': () => IMPORTED } });
    expect(screen.getByRole('button', { name: 'Điền vào form' })).toBeDisabled();
    paste('{"@type":"Recipe"}');
    await user.click(screen.getByRole('button', { name: 'Điền vào form' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Tên món' })).toHaveValue('Bò kho bánh mì'));
    expect(screen.getByRole('textbox', { name: 'Phút nấu' })).toHaveValue('90');
    expect(screen.getByRole('textbox', { name: 'Tên nguyên liệu' })).toHaveValue('Bắp bò');
    expect(screen.getByRole('textbox', { name: 'Phút hẹn giờ' })).toHaveValue('30');
  });

  it('says when the JSON holds no recipe', async () => {
    const { user } = await openBox({ handlers: { 'recipes.parse_json_ld': () => null } });
    paste('{"@type":"Article"}');
    await user.click(screen.getByRole('button', { name: 'Điền vào form' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thấy công thức trong nội dung này.');
  });

  it('says when the text is not JSON', async () => {
    const { user } = await openBox({
      handlers: {
        'recipes.parse_json_ld': () => {
          throw new EngineCallError('validation', 'expected value at line 1');
        },
      },
    });
    paste('{');
    await user.click(screen.getByRole('button', { name: 'Điền vào form' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nội dung này không phải JSON hợp lệ.');
  });
});

describe('edit recipe', () => {
  it('loads the stored values', async () => {
    renderEdit();
    expect(await screen.findByRole('textbox', { name: 'Tên món' })).toHaveValue('Gà kho gừng');
    expect(screen.getAllByRole('textbox', { name: 'Tên nguyên liệu' })).toHaveLength(3);
    expect(screen.getAllByRole('textbox', { name: /^Bước/ })).toHaveLength(3);
    expect(screen.queryByRole('heading', { name: 'Cách nhập công thức' })).not.toBeInTheDocument();
  });

  it('saves through update and goes back to the recipe', async () => {
    const view = renderEdit();
    const user = userEvent.setup();
    const name = await screen.findByRole('textbox', { name: 'Tên món' });
    await user.clear(name);
    await user.type(name, 'Gà kho sả');
    await user.click(screen.getByRole('button', { name: 'Lưu công thức' }));
    const [payload] = view.engine.callsTo('recipes.update') as { id: string; name: string }[];
    expect(payload).toMatchObject({ id: 'ga-kho', name: 'Gà kho sả' });
    await waitFor(() => expect(location()).toHaveTextContent('/recipes/list/ga-kho'));
  });

  it('shows an error for an unknown recipe', async () => {
    renderEdit('missing');
    expect(await screen.findByText(/Không tìm thấy dữ liệu này/)).toBeInTheDocument();
  });
});

describe('layouts', () => {
  it('shows the checklist in the dock on a wide layout', async () => {
    const view = renderEditor('/recipes/new', { width: 1280 });
    const dock = screen.getByRole('complementary', { name: 'Bảng bên phải' });
    expect(await within(dock).findByRole('list', { name: 'Kiểm tra trước khi lưu' })).toBeInTheDocument();
    expect(view.described.at(-1)?.hasDock).toBe(true);
  });

  it('shows the checklist in the page on a narrow layout', async () => {
    const view = renderEditor('/recipes/new', { width: 390 });
    expect(screen.getByRole('complementary', { name: 'Bảng bên phải' })).toBeEmptyDOMElement();
    expect(within(screen.getByRole('main')).getByRole('list', { name: 'Kiểm tra trước khi lưu' })).toBeInTheDocument();
    await waitFor(() => expect(view.described.at(-1)?.hasDock).toBe(false));
  });
});
