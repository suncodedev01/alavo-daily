import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useToday } from './useToday';

function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 9, 23, 30));
});

afterEach(() => {
  setVisibility('visible');
  vi.useRealTimers();
});

describe('useToday', () => {
  it('starts with the local date', () => {
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe('2026-10-09');
  });

  it('moves to the next day when local midnight passes', () => {
    const { result } = renderHook(() => useToday());
    act(() => {
      vi.advanceTimersByTime(29 * 60 * 1000);
    });
    expect(result.current).toBe('2026-10-09');
    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });
    expect(result.current).toBe('2026-10-10');
  });

  it('keeps following the day after the first rollover', () => {
    const { result } = renderHook(() => useToday());
    act(() => {
      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 60 * 1000);
    });
    expect(result.current).toBe('2026-10-10');
    act(() => {
      vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    });
    expect(result.current).toBe('2026-10-11');
  });

  it('catches up when the tab is shown again after the clock moved on', () => {
    const { result } = renderHook(() => useToday());
    setVisibility('hidden');
    vi.setSystemTime(new Date(2026, 9, 12, 8, 0));
    expect(result.current).toBe('2026-10-09');
    act(() => setVisibility('visible'));
    expect(result.current).toBe('2026-10-12');
  });

  it('ignores the tab being hidden', () => {
    const { result } = renderHook(() => useToday());
    vi.setSystemTime(new Date(2026, 9, 12, 8, 0));
    act(() => setVisibility('hidden'));
    expect(result.current).toBe('2026-10-09');
  });

  it('stops its timer and listener when unmounted', () => {
    const { unmount } = renderHook(() => useToday());
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
