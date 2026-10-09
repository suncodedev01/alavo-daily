import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { clearLoggedExpenses, markExpenseLogged } from '../logic/loggedExpenses';
import { useExpenseLogged } from './useExpenseLogged';

const range = { from: '2026-10-09', to: '2026-10-11' };

afterEach(() => clearLoggedExpenses());

describe('useExpenseLogged', () => {
  it('is false until the range is recorded', () => {
    const { result } = renderHook(() => useExpenseLogged(range));
    expect(result.current).toBe(false);
    act(() => markExpenseLogged(range));
    expect(result.current).toBe(true);
  });

  it('does not mix up different ranges', () => {
    const { result } = renderHook(() => useExpenseLogged({ from: '2026-10-12', to: '2026-10-18' }));
    act(() => markExpenseLogged(range));
    expect(result.current).toBe(false);
  });
});
