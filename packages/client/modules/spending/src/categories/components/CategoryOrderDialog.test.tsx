import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { createDemoData } from '../../testing/fixtures';
import { freezeToday, renderInSpendingShell, type SpendingRenderOptions } from '../../testing/renderSpending';
import { CategoryOrderDialog } from './CategoryOrderDialog';

freezeToday();

function Harness() {
  const [open, setOpen] = useState(true);
  return <CategoryOrderDialog open={open} onOpenChange={setOpen} />;
}

async function openDialog(options: SpendingRenderOptions = {}) {
  const view = renderInSpendingShell(<Harness />, options);
  const dialog = await screen.findByRole('dialog', { name: 'Hạng mục hiện ở ngoài' });
  await within(dialog).findByText('Ăn uống');
  return { ...view, dialog };
}

const names = (dialog: HTMLElement) =>
  within(dialog)
    .getAllByRole('listitem')
    .map((item) => item.textContent?.replace(/^\d+/, '').trim());

describe('category order dialog', () => {
  it('lists the expense categories in their order, each with its position', async () => {
    const { dialog } = await openDialog();
    expect(names(dialog)).toEqual(['Ăn uống', 'Đi lại', 'Mua sắm', 'Nhà ở', 'Hoá đơn']);
  });

  it('puts a divider after the sixth category so it is clear which ones show first', async () => {
    const data = createDemoData();
    for (let index = 1; index <= 3; index += 1) {
      data.categories.push({ ...data.categories[0]!, id: `category-extra-${index}`, name: `Thêm ${index}`, position: 10 + index });
    }
    const { dialog } = await openDialog({ data });
    const separator = within(dialog).getByRole('separator');
    const rows = within(dialog).getAllByRole('listitem');
    expect(separator).toHaveTextContent('Vào "Xem tất cả"');
    expect(rows[6]).toContainElement(separator);
  });

  it('sends the new order when a category moves up, and cannot move the first one further up', async () => {
    const { engine, dialog } = await openDialog();
    expect(within(dialog).getByRole('button', { name: 'Đưa Ăn uống lên' })).toBeDisabled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Đưa Đi lại lên' }));
    await waitFor(() =>
      expect(engine.callsTo('spending.reorder_categories')).toEqual([
        { ids: ['category-transport', 'category-food', 'category-shopping', 'category-home', 'category-bills'] },
      ]),
    );
    await waitFor(() => expect(names(dialog)[0]).toBe('Đi lại'));
  });

  it('switches to the income categories', async () => {
    const { dialog } = await openDialog();
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Thu nhập' }));
    expect(await within(dialog).findByText('Thu nhập', { selector: 'span' })).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).queryByText('Ăn uống')).not.toBeInTheDocument());
  });
});
