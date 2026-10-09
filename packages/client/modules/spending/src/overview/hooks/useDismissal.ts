import { useReducer, useRef } from 'react';

function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    return;
  }
}

export function useDismissal(key: string): { dismissed: boolean; dismiss: () => void } {
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const remembered = useRef(new Set<string>());
  return {
    dismissed: remembered.current.has(key) || readFlag(key),
    dismiss: () => {
      remembered.current.add(key);
      writeFlag(key);
      rerender();
    },
  };
}
