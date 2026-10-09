import { useReducer, useRef } from 'react';

import { readFlag, writeFlag } from '../logic/dismissalFlag';

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
