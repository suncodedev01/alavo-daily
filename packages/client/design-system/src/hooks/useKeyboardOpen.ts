import { useEffect, useState } from 'react';

import { measureVisibleArea } from './keyboardInset';

const KEYBOARD_HEIGHT_RATIO = 0.8;
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'tel', 'url', 'number', 'password']);

function isTextEntry(element: Element | null): boolean {
  if (element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(element.type);
  return element instanceof HTMLElement && element.isContentEditable;
}

export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let tallest = window.innerHeight;
    const update = () => {
      tallest = Math.max(tallest, window.innerHeight);
      const shrunk = window.innerHeight < tallest * KEYBOARD_HEIGHT_RATIO || measureVisibleArea() !== null;
      setOpen(shrunk && isTextEntry(document.activeElement));
    };
    const updateAfterBlur = () => window.setTimeout(update);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', updateAfterBlur);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', updateAfterBlur);
    };
  }, []);
  return open;
}
