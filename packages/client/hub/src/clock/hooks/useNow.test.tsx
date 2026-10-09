import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { millisUntilNextMealWindow } from '../../screens/today/logic/todayMeals';
import { useNow } from './useNow';

const at = (hour: number, minute = 0) => new Date(2026, 9, 9, hour, minute);

beforeEach(() => vi.useFakeTimers({ now: at(9, 59) }));
afterEach(() => vi.useRealTimers());

function renderNow() {
  return renderHook(() => useNow(millisUntilNextMealWindow));
}

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useNow with the meal windows', () => {
  it('moves to 10:00 by itself when the clock crosses the boundary', () => {
    const { result } = renderNow();
    expect(result.current.getHours()).toBe(9);
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.getHours()).toBe(10);
  });

  it('keeps going to the next boundary after the first one', () => {
    const { result } = renderNow();
    act(() => vi.advanceTimersByTime(60_000 + 5 * 3_600_000));
    expect(result.current.getHours()).toBe(15);
  });

  it('crosses midnight into the next day', () => {
    vi.setSystemTime(at(23, 59));
    const { result } = renderNow();
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.getDate()).toBe(10);
    expect(result.current.getHours()).toBe(0);
  });

  it('catches up when the tab becomes visible again after a long sleep', () => {
    const { result } = renderNow();
    vi.setSystemTime(at(16, 30));
    act(() => setVisibility('visible'));
    expect(result.current.getHours()).toBe(16);
  });

  it('ignores a tab that is hidden', () => {
    const { result } = renderNow();
    vi.setSystemTime(at(16, 30));
    act(() => setVisibility('hidden'));
    expect(result.current.getHours()).toBe(9);
    setVisibility('visible');
  });

  it('stops its timer when the screen goes away', () => {
    const { unmount } = renderNow();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
