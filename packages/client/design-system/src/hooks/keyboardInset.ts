import { useEffect } from 'react';

const MIN_KEYBOARD_HEIGHT = 80;
const ZOOMED_SCALE = 1.01;
const SCROLL_DELAY_MS = 300;
const INSET_VARIABLE = '--keyboard-inset';
const VISIBLE_HEIGHT_VARIABLE = '--visible-height';
const VISIBLE_CENTER_VARIABLE = '--visible-center';

interface VisibleArea {
  keyboardInset: number;
  height: number;
  center: number;
}

export function measureVisibleArea(viewport: VisualViewport | null = window.visualViewport): VisibleArea | null {
  if (!viewport || viewport.scale > ZOOMED_SCALE) return null;
  const keyboardInset = window.innerHeight - viewport.height - viewport.offsetTop;
  if (keyboardInset < MIN_KEYBOARD_HEIGHT) return null;
  return { keyboardInset, height: viewport.height, center: viewport.offsetTop + viewport.height / 2 };
}

function publish(area: VisibleArea | null): void {
  const style = document.documentElement.style;
  if (!area) {
    [INSET_VARIABLE, VISIBLE_HEIGHT_VARIABLE, VISIBLE_CENTER_VARIABLE].forEach((name) => style.removeProperty(name));
    return;
  }
  style.setProperty(INSET_VARIABLE, `${Math.round(area.keyboardInset)}px`);
  style.setProperty(VISIBLE_HEIGHT_VARIABLE, `${Math.round(area.height)}px`);
  style.setProperty(VISIBLE_CENTER_VARIABLE, `${Math.round(area.center)}px`);
}

function isFormField(element: EventTarget | null): element is HTMLElement {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
}

/**
 * On phones the keyboard can cover the page without resizing it. This publishes how much it covers
 * as CSS variables, so sheets and dialogs can sit in the part of the screen that is still visible,
 * and keeps the focused field in view.
 */
export function useKeyboardInset(): void {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const update = () => publish(measureVisibleArea(viewport));
    const keepFieldVisible = (event: FocusEvent) => {
      if (!isFormField(event.target)) return;
      const field = event.target;
      window.setTimeout(() => {
        if (measureVisibleArea(viewport)) field.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, SCROLL_DELAY_MS);
    };
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    document.addEventListener('focusin', keepFieldVisible);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      document.removeEventListener('focusin', keepFieldVisible);
      publish(null);
    };
  }, []);
}
