import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useToday } from './useToday';

const ELEVEN_PM = new Date(2026, 9, 9, 23, 0, 0);
const HOUR_MS = 60 * 60 * 1000;

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(ELEVEN_PM);
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

  it('stays on the same date before midnight', () => {
    const { result } = renderHook(() => useToday());
    act(() => vi.advanceTimersByTime(HOUR_MS - 5000));
    expect(result.current).toBe('2026-10-09');
  });

  it('moves to the next date at local midnight without any user action', () => {
    const { result } = renderHook(() => useToday());
    act(() => vi.advanceTimersByTime(HOUR_MS + 1500));
    expect(result.current).toBe('2026-10-10');
  });

  it('keeps following midnight on the days after', () => {
    const { result } = renderHook(() => useToday());
    act(() => vi.advanceTimersByTime(HOUR_MS + 1500));
    act(() => vi.advanceTimersByTime(24 * HOUR_MS));
    expect(result.current).toBe('2026-10-11');
    act(() => vi.advanceTimersByTime(24 * HOUR_MS));
    expect(result.current).toBe('2026-10-12');
  });

  it('catches up when the tab becomes visible after the computer slept past midnight', () => {
    const { result } = renderHook(() => useToday());
    setVisibility('hidden');
    vi.setSystemTime(new Date(2026, 9, 11, 8, 0, 0));
    expect(result.current).toBe('2026-10-09');
    act(() => setVisibility('visible'));
    expect(result.current).toBe('2026-10-11');
  });

  it('does not refresh while the tab is hidden', () => {
    const { result } = renderHook(() => useToday());
    vi.setSystemTime(new Date(2026, 9, 10, 8, 0, 0));
    act(() => setVisibility('hidden'));
    expect(result.current).toBe('2026-10-09');
  });

  it('still fires the midnight timer after a visibility refresh', () => {
    const { result } = renderHook(() => useToday());
    act(() => setVisibility('visible'));
    act(() => vi.advanceTimersByTime(HOUR_MS + 1500));
    expect(result.current).toBe('2026-10-10');
  });

  it('stops listening and clears its timer when unmounted', () => {
    const { unmount } = renderHook(() => useToday());
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
