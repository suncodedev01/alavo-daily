import type { Category } from '@alavo-daily/common/engine';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderInSpendingShell } from '../../testing/renderSpending';
import { CategoryPicker } from './CategoryPicker';

const CATEGORIES: Category[] = [
  { id: 'c1', name: 'Ăn uống', icon: 'fork-knife', kind: 'expense', budgetVnd: null, isFixed: false, position: 1 },
  { id: 'c2', name: 'Đi lại', icon: 'car', kind: 'expense', budgetVnd: null, isFixed: false, position: 2 },
];

describe('CategoryPicker', () => {
  it('draws the sticker of each category inside its button', () => {
    renderInSpendingShell(
      <CategoryPicker categories={CATEGORIES} selectedId="c1" onSelect={() => undefined} onCreate={() => undefined} />,
    );
    const food = screen.getByRole('button', { name: 'Ăn uống', pressed: true });
    expect(food.querySelector('img')).toHaveAttribute('data-sticker', 'steaming_bowl');
    const transport = screen.getByRole('button', { name: 'Đi lại', pressed: false });
    expect(transport.querySelector('img')).toHaveAttribute('data-sticker', 'automobile');
  });
});

const MANY: Category[] = ['Ăn uống', 'Đi lại', 'Mua sắm', 'Giải trí', 'Sức khoẻ', 'Nhà cửa', 'Thú cưng', 'Quà tặng'].map(
  (name, index) => ({
    id: `m${index}`,
    name,
    icon: 'tag',
    kind: 'expense',
    budgetVnd: null,
    isFixed: false,
    position: index,
  }),
);

describe('CategoryPicker with many categories', () => {
  it('shows six categories and finds the rest through "Xem tất cả" with a diacritic-free search', async () => {
    const chosen: string[] = [];
    renderInSpendingShell(
      <CategoryPicker
        categories={MANY}
        selectedId="m0"
        onSelect={(id) => chosen.push(id)}
        onCreate={() => undefined}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Thú cưng' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xem tất cả' }));
    const dialog = await screen.findByRole('dialog', { name: 'Chọn hạng mục' });
    await userEvent.type(within(dialog).getByRole('searchbox'), 'thu cung');
    expect(within(dialog).queryByRole('button', { name: 'Ăn uống' })).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thú cưng' }));
    expect(chosen).toEqual(['m6']);
  });

  it('says so when nothing matches', async () => {
    renderInSpendingShell(
      <CategoryPicker categories={MANY} selectedId="m0" onSelect={() => undefined} onCreate={() => undefined} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Xem tất cả' }));
    const dialog = await screen.findByRole('dialog', { name: 'Chọn hạng mục' });
    await userEvent.type(within(dialog).getByRole('searchbox'), 'zzz');
    expect(within(dialog).getByText('Không tìm thấy hạng mục nào.')).toBeInTheDocument();
  });
});
