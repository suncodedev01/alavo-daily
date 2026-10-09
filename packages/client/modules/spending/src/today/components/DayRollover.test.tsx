import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { freezeToday, renderSpending } from '../../testing/renderSpending';

freezeToday('2026-10-31');

async function rollOverTo(next: Date) {
  vi.setSystemTime(next);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

describe('a long-open app after midnight', () => {
  it('moves the current month of the overview to the new month', async () => {
    renderSpending({ route: '/spending/overview' });
    expect(await screen.findByText('Tháng 10, 2026')).toBeInTheDocument();
    await rollOverTo(new Date(2026, 10, 1, 8, 0));
    expect(await screen.findByText('Tháng 11, 2026')).toBeInTheDocument();
  });

  it('asks the engine about the new day and month instead of yesterday', async () => {
    const { engine } = renderSpending({ route: '/spending/budgets' });
    await screen.findByText('Tháng 10, 2026');
    await rollOverTo(new Date(2026, 10, 1, 8, 0));
    await waitFor(() =>
      expect(engine.callsTo('spending.budget_status')).toContainEqual({ month: '2026-11', today: '2026-11-01' }),
    );
  });

  it('keeps a month the person chose by hand', async () => {
    renderSpending({ route: '/spending/overview?month=2026-08' });
    expect(await screen.findByText('Tháng 8, 2026')).toBeInTheDocument();
    await rollOverTo(new Date(2026, 10, 1, 8, 0));
    expect(screen.getByText('Tháng 8, 2026')).toBeInTheDocument();
  });
});
