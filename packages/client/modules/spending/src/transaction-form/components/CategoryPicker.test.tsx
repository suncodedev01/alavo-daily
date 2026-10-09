import type { Category } from '@alavo-daily/common/engine';
import { screen } from '@testing-library/react';
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
