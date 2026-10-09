import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { IconGrid } from './IconGrid';

describe('IconGrid', () => {
  it('shows the sticker of every icon and keeps the stored icon name as the button label', () => {
    render(<IconGrid icons={['car', 'paw-print']} value="car" onChange={() => undefined} label="Biểu tượng" />);
    const car = screen.getByRole('button', { name: 'car', pressed: true });
    expect(car.querySelector('img')).toHaveAttribute('data-sticker', 'automobile');
    const paw = screen.getByRole('button', { name: 'paw-print', pressed: false });
    expect(paw.querySelector('img')).toHaveAttribute('data-sticker', 'paw_prints');
  });

  it('reports the stored icon name when a sticker is picked', async () => {
    const onChange = vi.fn();
    render(<IconGrid icons={['car', 'paw-print']} value="car" onChange={onChange} label="Biểu tượng" />);
    await userEvent.click(screen.getByRole('button', { name: 'paw-print' }));
    expect(onChange).toHaveBeenCalledWith('paw-print');
  });
});
