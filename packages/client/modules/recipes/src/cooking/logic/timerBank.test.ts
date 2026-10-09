import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TimerBank } from './timerBank';

function bankWith(seconds: number) {
  return new TimerBank(new Map([[0, seconds]]));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TimerBank', () => {
  it('only knows the steps that have a timer', () => {
    const bank = bankWith(60);
    expect(bank.has(0)).toBe(true);
    expect(bank.has(1)).toBe(false);
    expect(bank.status(0)).toBe('idle');
    expect(bank.secondsLeft(0)).toBe(60);
  });

  it('counts down while running', () => {
    const bank = bankWith(60);
    bank.start(0);
    vi.advanceTimersByTime(3000);
    expect(bank.secondsLeft(0)).toBe(57);
    expect(bank.status(0)).toBe('running');
    bank.stopClock();
  });

  it('keeps the remaining time when paused and continues from there', () => {
    const bank = bankWith(60);
    bank.start(0);
    vi.advanceTimersByTime(10_000);
    bank.pause(0);
    vi.advanceTimersByTime(30_000);
    expect(bank.secondsLeft(0)).toBe(50);
    expect(bank.status(0)).toBe('paused');
    bank.start(0);
    vi.advanceTimersByTime(5000);
    expect(bank.secondsLeft(0)).toBe(45);
    bank.stopClock();
  });

  it('goes back to the full time on reset', () => {
    const bank = bankWith(60);
    bank.start(0);
    vi.advanceTimersByTime(20_000);
    bank.reset(0);
    expect(bank.secondsLeft(0)).toBe(60);
    expect(bank.status(0)).toBe('idle');
    expect(bank.runningSteps()).toEqual([]);
  });

  it('finishes once and tells the listeners which step ended', () => {
    const bank = bankWith(5);
    const finished: number[] = [];
    bank.onFinish((step) => finished.push(step));
    bank.start(0);
    vi.advanceTimersByTime(10_000);
    expect(finished).toEqual([0]);
    expect(bank.status(0)).toBe('done');
    expect(bank.secondsLeft(0)).toBe(0);
  });

  it('restarts from the full time after it is done', () => {
    const bank = bankWith(5);
    bank.start(0);
    vi.advanceTimersByTime(6000);
    bank.start(0);
    expect(bank.status(0)).toBe('running');
    expect(bank.secondsLeft(0)).toBe(5);
    bank.stopClock();
  });

  it('tells subscribers about every tick and stops the clock when idle', () => {
    const bank = bankWith(60);
    const listener = vi.fn();
    bank.subscribe(listener);
    bank.start(0);
    listener.mockClear();
    vi.advanceTimersByTime(2000);
    expect(listener).toHaveBeenCalledTimes(2);
    bank.pause(0);
    listener.mockClear();
    vi.advanceTimersByTime(5000);
    expect(listener).not.toHaveBeenCalled();
  });

  it('describes the running timers of other steps', () => {
    const bank = new TimerBank(new Map([[0, 60], [2, 120]]));
    bank.start(2);
    expect(bank.runningSnapshot(0)).toBe('2:120');
    expect(bank.runningSnapshot(2)).toBe('');
    bank.stopClock();
  });

  it('ignores actions for a step without a timer', () => {
    const bank = bankWith(60);
    bank.start(3);
    bank.pause(3);
    bank.reset(3);
    expect(bank.secondsLeft(3)).toBe(0);
  });
});
