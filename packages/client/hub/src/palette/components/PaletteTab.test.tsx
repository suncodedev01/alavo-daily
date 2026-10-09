import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFakePlatform } from '@alavo-daily/common/testing';

import { AlavoApp } from '../../app';
import { createHubEngine } from '../../testing/hubEngine';
import { TEST_MODULES, renderHub, setViewportWidth } from '../../testing/renderHub';
import { tabFromParam } from '../../screens/settings/components/SettingsScreen';
import { PALETTES } from '../logic/palettes';

const root = document.documentElement;

function resetPaletteState() {
  window.localStorage.clear();
  delete root.dataset.palette;
}

beforeEach(() => {
  resetPaletteState();
  setViewportWidth(1280);
});

afterEach(() => {
  vi.restoreAllMocks();
  resetPaletteState();
});

async function openPaletteTab(options: Parameters<typeof renderHub>[1] = {}) {
  const view = renderHub('/settings/palette', options);
  await screen.findByRole('radiogroup', { name: /Bộ màu|Colour themes/ });
  return view;
}

describe('settings tabs', () => {
  it('adds a third tab for the colour themes and reaches it from the tab bar', async () => {
    const user = userEvent.setup();
    renderHub('/settings/sync');
    await user.click(await screen.findByRole('radio', { name: 'Bộ màu' }));
    expect(screen.getByLabelText('Đường dẫn hiện tại')).toHaveTextContent('/settings/palette');
    expect(await screen.findByRole('radiogroup', { name: 'Bộ màu' })).toBeInTheDocument();
  });

  it('maps the palette route and still falls back to sync', () => {
    expect(tabFromParam('palette')).toBe('palette');
    expect(tabFromParam('notifications')).toBe('notifications');
    expect(tabFromParam('x')).toBe('sync');
  });

  it('keeps the appearance and language cards under the colour themes', async () => {
    await openPaletteTab();
    expect(screen.getByRole('heading', { name: 'Giao diện' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ngôn ngữ' })).toBeInTheDocument();
  });
});

describe('palette cards', () => {
  it('shows one card for each of the eight palettes, the gold one in use', async () => {
    await openPaletteTab();
    const group = screen.getByRole('radiogroup', { name: 'Bộ màu' });
    expect(within(group).getAllByRole('radio')).toHaveLength(8);
    for (const palette of PALETTES) {
      expect(within(group).getByRole('radio', { name: palette.name })).toBeInTheDocument();
    }
    expect(within(group).getByRole('radio', { name: 'Vàng kim' })).toBeChecked();
    expect(root.dataset.palette).toBeUndefined();
  });

  it('describes each card with its short description', async () => {
    await openPaletteTab();
    expect(screen.getByRole('radio', { name: 'Mộc · Xanh lá' })).toHaveAccessibleDescription('Xanh lá, tăng trưởng');
  });

  it('applies a palette at once and remembers it', async () => {
    const user = userEvent.setup();
    await openPaletteTab();
    await user.click(screen.getByRole('radio', { name: 'Mộc · Xanh lá' }));
    expect(root.dataset.palette).toBe('moc');
    expect(window.localStorage.getItem('alavo-palette')).toBe('moc');
    expect(screen.getByRole('radio', { name: 'Mộc · Xanh lá' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Vàng kim' })).not.toBeChecked();
    expect(screen.getByText('Đang dùng')).toBeInTheDocument();
  });

  it('removes the attribute again when the default palette is chosen', async () => {
    const user = userEvent.setup();
    await openPaletteTab();
    await user.click(screen.getByRole('radio', { name: 'Hồng đào' }));
    expect(root.dataset.palette).toBe('hong');
    await user.click(screen.getByRole('radio', { name: 'Vàng kim' }));
    expect(root).not.toHaveAttribute('data-palette');
    expect(window.localStorage.getItem('alavo-palette')).toBe('vang');
  });

  it('moves the choice with the arrow keys and wraps around', async () => {
    const user = userEvent.setup();
    await openPaletteTab();
    screen.getByRole('radio', { name: 'Vàng kim' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(root.dataset.palette).toBe('phuquy');
    expect(screen.getByRole('radio', { name: 'Phú quý · Tím vàng' })).toHaveFocus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(root.dataset.palette).toBe('hong');
    await user.keyboard('{Home}');
    expect(root).not.toHaveAttribute('data-palette');
    await user.keyboard('{End}');
    expect(root.dataset.palette).toBe('hong');
  });

  it('keeps only the chosen card in the tab order', async () => {
    await openPaletteTab();
    const tabbable = screen.getAllByRole('radio', { name: /· |Vàng kim|Hồng đào/ }).filter((card) => card.tabIndex === 0);
    expect(tabbable.map((card) => card.getAttribute('aria-checked'))).toEqual(['true']);
  });

  it('works when the browser refuses to store anything', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    await openPaletteTab();
    await user.click(screen.getByRole('radio', { name: 'Thủy · Xanh biển' }));
    expect(root.dataset.palette).toBe('thuy');
    expect(screen.getByRole('radio', { name: 'Thủy · Xanh biển' })).toBeChecked();
  });
});

describe('remembering the palette', () => {
  it('applies the stored palette when the app starts again', async () => {
    window.localStorage.setItem('alavo-palette', 'hoa');

    render(<AlavoApp engine={createHubEngine().engine} platform={createFakePlatform()} modules={TEST_MODULES} />);
    await screen.findByRole('heading', { name: 'Chào bạn' });
    expect(root.dataset.palette).toBe('hoa');
  });

  it('shows the stored palette as the chosen card', async () => {
    window.localStorage.setItem('alavo-palette', 'kim');
    await openPaletteTab();
    expect(screen.getByRole('radio', { name: 'Kim · Trắng bạc' })).toBeChecked();
    expect(root.dataset.palette).toBe('kim');
  });

  it('ignores a stored palette that does not exist', async () => {
    window.localStorage.setItem('alavo-palette', 'khong-co');
    await openPaletteTab();
    expect(root).not.toHaveAttribute('data-palette');
    expect(screen.getByRole('radio', { name: 'Vàng kim' })).toBeChecked();
  });
});

describe('colour theme by element', () => {
  async function typeYear(user: ReturnType<typeof userEvent.setup>, year: string) {
    const field = screen.getByRole('textbox', { name: 'Năm sinh' });
    await user.clear(field);
    await user.type(field, year);
  }

  it('asks for a birth year or an element before showing anything', async () => {
    await openPaletteTab();
    expect(screen.getByText('Nhập năm sinh hoặc chọn mệnh để xem bộ màu hợp.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Dùng bộ/ })).not.toBeInTheDocument();
  });

  it('names the element for a birth year and groups the palettes', async () => {
    const user = userEvent.setup();
    await openPaletteTab();
    await typeYear(user, '1984');
    expect(screen.getByText('Năm âm lịch 1984 · Giáp Tý · mệnh Kim')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kim' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Hợp mệnh Kim' })).toBeInTheDocument();
    expect(screen.getByText('Màu bản mệnh: trắng, xám, bạc.')).toBeInTheDocument();
    const own = screen.getByRole('heading', { name: 'Hợp mệnh Kim' }).parentElement!;
    expect(within(own).getByRole('button', { name: 'Kim · Trắng bạc' })).toBeInTheDocument();
    const avoid = screen.getByRole('heading', { name: 'Nên hạn chế' }).parentElement!;
    expect(within(avoid).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Hỏa · Tím hồng',
      'Hồng đào',
    ]);
    const partial = screen.getByRole('heading', { name: 'Hợp một phần' }).parentElement!;
    expect(within(partial).getByRole('button', { name: 'Phú quý · Tím vàng' })).toBeInTheDocument();
  });

  it('badges the cards with how they suit the element', async () => {
    const user = userEvent.setup();
    await openPaletteTab();
    await user.click(screen.getByRole('button', { name: 'Thổ' }));
    const gold = screen.getByRole('radio', { name: 'Vàng kim' });
    expect(within(gold).getByText('Hợp mệnh')).toBeInTheDocument();
    expect(within(screen.getByRole('radio', { name: 'Mộc · Xanh lá' })).getByText('Nên hạn chế')).toBeInTheDocument();
    expect(within(screen.getByRole('radio', { name: 'Kim · Trắng bạc' })).queryByText(/Hợp|Tương|Nên/)).toBeNull();
  });

  it('moves the year back one when born before Tết', async () => {
    const user = userEvent.setup();
    await openPaletteTab();
    await typeYear(user, '1990');
    expect(screen.getByText('Năm âm lịch 1990 · Canh Ngọ · mệnh Thổ')).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Sinh trước Tết (tháng 1–2)' }));
    expect(screen.getByText('Năm âm lịch 1989 · Kỷ Tỵ · mệnh Mộc')).toBeInTheDocument();
  });

  it('applies the suggested palette with one button and remembers the element', async () => {
    const user = userEvent.setup();
    await openPaletteTab();
    await typeYear(user, '2000');
    await user.click(screen.getByRole('button', { name: 'Dùng bộ Kim · Trắng bạc' }));
    expect(root.dataset.palette).toBe('kim');
    expect(screen.getByRole('radio', { name: 'Kim · Trắng bạc' })).toBeChecked();
    expect(window.localStorage.getItem('alavo-menh')).toBe('kim');
    expect(window.localStorage.getItem('alavo-menh-year')).toBe('2000');
  });

  it('lets a palette be picked from the chips under each group', async () => {
    const user = userEvent.setup();
    await openPaletteTab();
    await user.click(screen.getByRole('button', { name: 'Mộc' }));
    const supporting = screen.getByRole('heading', { name: 'Tương sinh' }).parentElement!;
    await user.click(within(supporting).getByRole('button', { name: 'Thủy · Xanh biển' }));
    expect(root.dataset.palette).toBe('thuy');
    expect(within(supporting).getByRole('button', { name: 'Thủy · Xanh biển' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('clears the year when another element is chosen by hand', async () => {
    const user = userEvent.setup();
    await openPaletteTab();
    await typeYear(user, '1984');
    await user.click(screen.getByRole('button', { name: 'Hỏa' }));
    expect(screen.getByRole('textbox', { name: 'Năm sinh' })).toHaveValue('');
    expect(screen.queryByText(/Năm âm lịch/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hợp mệnh Hỏa' })).toBeInTheDocument();
  });

  it('keeps digits only and at most four of them', async () => {
    const user = userEvent.setup();
    await openPaletteTab();
    await typeYear(user, '19a9x5');
    expect(screen.getByRole('textbox', { name: 'Năm sinh' })).toHaveValue('1995');
  });

  it('explains a year outside 1900 to 2100 once it looks finished', async () => {
    const user = userEvent.setup();
    await openPaletteTab();
    await typeYear(user, '19');
    expect(screen.queryByText('Nhập năm từ 1900 đến 2100.')).not.toBeInTheDocument();
    await typeYear(user, '1850');
    expect(screen.getByText('Nhập năm từ 1900 đến 2100.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Năm sinh' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox', { name: 'Năm sinh' })).toHaveAccessibleDescription('Nhập năm từ 1900 đến 2100.');
    await typeYear(user, '2101');
    expect(screen.getByText('Nhập năm từ 1900 đến 2100.')).toBeInTheDocument();
    await typeYear(user, '2100');
    expect(screen.queryByText('Nhập năm từ 1900 đến 2100.')).not.toBeInTheDocument();
  });

  it('explains a short year after leaving the field', async () => {
    const user = userEvent.setup();
    await openPaletteTab();
    await typeYear(user, '19');
    await user.tab();
    expect(screen.getByText('Nhập năm từ 1900 đến 2100.')).toBeInTheDocument();
  });

  it('keeps the previous element while the year is invalid', async () => {
    const user = userEvent.setup();
    await openPaletteTab();
    await typeYear(user, '1984');
    await typeYear(user, '1850');
    expect(screen.getByRole('heading', { name: 'Hợp mệnh Kim' })).toBeInTheDocument();
  });

  it('remembers the element, the year and the Tết switch', async () => {
    const user = userEvent.setup();
    const first = await openPaletteTab();
    await typeYear(user, '1990');
    await user.click(screen.getByRole('switch', { name: 'Sinh trước Tết (tháng 1–2)' }));
    first.unmount();

    await openPaletteTab();
    expect(screen.getByRole('textbox', { name: 'Năm sinh' })).toHaveValue('1990');
    expect(screen.getByRole('switch', { name: 'Sinh trước Tết (tháng 1–2)' })).toBeChecked();
    expect(screen.getByText('Năm âm lịch 1989 · Kỷ Tỵ · mệnh Mộc')).toBeInTheDocument();
  });

  it('ignores a stored element that does not exist', async () => {
    window.localStorage.setItem('alavo-menh', 'lua');
    await openPaletteTab();
    expect(screen.getByText('Nhập năm sinh hoặc chọn mệnh để xem bộ màu hợp.')).toBeInTheDocument();
  });

  it('uses no native select or date control', async () => {
    await openPaletteTab();
    expect(document.querySelector('select, input[type="date"], input[type="time"], input[type="number"]')).toBeNull();
  });
});

describe('narrow layout', () => {
  it('shows every control on a phone and keeps the tab bar inside 360px', async () => {
    setViewportWidth(360);
    await openPaletteTab();
    expect(screen.getAllByRole('radio', { name: /· |Vàng kim|Hồng đào/ }).length).toBeGreaterThanOrEqual(8);
    expect(screen.getByRole('textbox', { name: 'Năm sinh' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Sinh trước Tết (tháng 1–2)' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Bộ màu' })).toBeInTheDocument();
  });

  it('puts the cards in one column below the small breakpoint', async () => {
    setViewportWidth(390);
    await openPaletteTab();
    const group = screen.getByRole('radiogroup', { name: 'Bộ màu' });
    expect(group.className).toContain('grid-cols-1');
  });
});

describe('English', () => {
  it('translates the tab, the cards and the element helper', async () => {
    const user = userEvent.setup();
    await openPaletteTab({ language: 'en' });
    expect(screen.getByRole('radio', { name: 'Colour themes' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Gold' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Prosperity · Purple and gold' })).toBeInTheDocument();
    expect(screen.getByText('In use')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Birth year' }), '1984');
    expect(screen.getByText('Lunar year 1984 · Giáp Tý · Kim element')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use Kim · Silver white' })).toBeInTheDocument();
  });
});
