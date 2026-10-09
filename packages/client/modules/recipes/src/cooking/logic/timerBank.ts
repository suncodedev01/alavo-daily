import type { TimerStatus } from '../types';
interface TimerState {
  totalSec: number;
  leftSec: number;
  status: TimerStatus;
  endsAt: number;
}

const TICK_MS = 1000;

export class TimerBank {
  private readonly timers = new Map<number, TimerState>();
  private readonly listeners = new Set<() => void>();
  private readonly finishListeners = new Set<(step: number) => void>();
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(durationsSec: ReadonlyMap<number, number>) {
    for (const [step, totalSec] of durationsSec) {
      this.timers.set(step, { totalSec, leftSec: totalSec, status: 'idle', endsAt: 0 });
    }
  }

  has = (step: number): boolean => this.timers.has(step);

  totalSeconds = (step: number): number => this.timers.get(step)?.totalSec ?? 0;

  secondsLeft = (step: number): number => this.timers.get(step)?.leftSec ?? 0;

  status = (step: number): TimerStatus => this.timers.get(step)?.status ?? 'idle';

  runningSnapshot = (exceptStep: number): string =>
    this.runningSteps()
      .filter((step) => step !== exceptStep)
      .map((step) => `${step}:${this.secondsLeft(step)}`)
      .join('|');

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  onFinish = (listener: (step: number) => void): (() => void) => {
    this.finishListeners.add(listener);
    return () => this.finishListeners.delete(listener);
  };

  start(step: number): void {
    const timer = this.timers.get(step);
    if (!timer || timer.status === 'running') return;
    if (timer.status === 'done') timer.leftSec = timer.totalSec;
    timer.status = 'running';
    timer.endsAt = Date.now() + timer.leftSec * TICK_MS;
    this.ensureClock();
    this.notify();
  }

  pause(step: number): void {
    const timer = this.timers.get(step);
    if (!timer || timer.status !== 'running') return;
    timer.leftSec = secondsUntil(timer.endsAt);
    timer.status = 'paused';
    this.stopClockWhenIdle();
    this.notify();
  }

  reset(step: number): void {
    const timer = this.timers.get(step);
    if (!timer) return;
    timer.leftSec = timer.totalSec;
    timer.status = 'idle';
    this.stopClockWhenIdle();
    this.notify();
  }

  runningSteps(): number[] {
    return [...this.timers].filter(([, timer]) => timer.status === 'running').map(([step]) => step);
  }

  stopClock(): void {
    if (this.interval !== null) clearInterval(this.interval);
    this.interval = null;
  }

  private ensureClock(): void {
    if (this.interval === null) this.interval = setInterval(() => this.tick(), TICK_MS);
  }

  private stopClockWhenIdle(): void {
    if (this.runningSteps().length === 0) this.stopClock();
  }

  private tick(): void {
    const finished: number[] = [];
    for (const [step, timer] of this.timers) {
      if (timer.status !== 'running') continue;
      timer.leftSec = secondsUntil(timer.endsAt);
      if (timer.leftSec <= 0) {
        timer.status = 'done';
        finished.push(step);
      }
    }
    this.stopClockWhenIdle();
    this.notify();
    finished.forEach((step) => this.finishListeners.forEach((listener) => listener(step)));
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

function secondsUntil(endsAt: number): number {
  return Math.max(0, Math.ceil((endsAt - Date.now()) / TICK_MS));
}
