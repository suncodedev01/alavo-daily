import '@alavo-daily/common/testing/setup';
import { afterEach } from 'vitest';

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverStub;

const WIDE_DEFAULT_WIDTH = 1280;

afterEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: WIDE_DEFAULT_WIDTH });
  window.localStorage.clear();
});
