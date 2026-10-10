import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { measureVisibleArea, useKeyboardInset } from './keyboardInset';

interface FakeViewport {
  height: number;
  offsetTop: number;
  scale: number;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

function fakeViewport(overrides: Partial<FakeViewport> = {}): FakeViewport {
  return { height: 800, offsetTop: 0, scale: 1, addEventListener: vi.fn(), removeEventListener: vi.fn(), ...overrides };
}

function install(viewport: FakeViewport | undefined): void {
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
}

function Probe() {
  useKeyboardInset();
  return null;
}

const rootStyle = (name: string) => document.documentElement.style.getPropertyValue(name);

describe('measureVisibleArea', () => {
  afterEach(() => install(undefined));

  it('reports nothing when the whole page is visible', () => {
    install(fakeViewport());
    expect(measureVisibleArea()).toBeNull();
  });

  it('reports what the keyboard covers even though the page was not resized', () => {
    install(fakeViewport({ height: 501, offsetTop: 151 }));
    expect(measureVisibleArea()).toEqual({ keyboardInset: 148, height: 501, center: 401.5 });
  });

  it('ignores a pinch zoom, which also shrinks the visible area', () => {
    install(fakeViewport({ height: 400, scale: 2 }));
    expect(measureVisibleArea()).toBeNull();
  });

  it('ignores a browser bar that is smaller than any keyboard', () => {
    install(fakeViewport({ height: 740 }));
    expect(measureVisibleArea()).toBeNull();
  });

  it('works without the visual viewport API', () => {
    install(undefined);
    expect(measureVisibleArea()).toBeNull();
  });
});

describe('useKeyboardInset', () => {
  beforeEach(() => install(fakeViewport({ height: 500 })));
  afterEach(() => {
    install(undefined);
    document.documentElement.removeAttribute('style');
  });

  it('publishes the covered height as style variables while the keyboard is open', () => {
    const viewport = fakeViewport({ height: 500 });
    install(viewport);
    render(<Probe />);
    const onResize = viewport.addEventListener.mock.calls.find(([name]) => name === 'resize')?.[1] as () => void;
    act(() => onResize());
    expect(rootStyle('--keyboard-inset')).toBe('300px');
    expect(rootStyle('--visible-height')).toBe('500px');
    expect(rootStyle('--visible-center')).toBe('250px');
  });

  it('clears the variables when the keyboard closes and when it unmounts', () => {
    const viewport = fakeViewport({ height: 500 });
    install(viewport);
    const { unmount } = render(<Probe />);
    const onResize = viewport.addEventListener.mock.calls.find(([name]) => name === 'resize')?.[1] as () => void;
    act(() => onResize());
    viewport.height = 800;
    act(() => onResize());
    expect(rootStyle('--keyboard-inset')).toBe('');
    viewport.height = 500;
    act(() => onResize());
    unmount();
    expect(rootStyle('--keyboard-inset')).toBe('');
    expect(viewport.removeEventListener).toHaveBeenCalledWith('resize', onResize);
  });
});
