import { useCallback, useMemo, useState } from 'react';

import type { ScreenInfo } from '@alavo-daily/common';

import type { ShellState } from '../types';

/** Holds what the current screen declared and the elements its portals render into. */
export function useShellSlots(): ShellState {
  const [info, setInfo] = useState<ScreenInfo | null>(null);
  const [actions, setActions] = useState<HTMLElement | null>(null);
  const [list, setList] = useState<HTMLElement | null>(null);
  const [dock, setDock] = useState<HTMLElement | null>(null);
  const describeScreen = useCallback((next: ScreenInfo) => {
    setInfo(next);
    return () => setInfo((current) => (current === next ? null : current));
  }, []);
  const slots = useMemo(
    () => ({ actions, list, dock, describeScreen }),
    [actions, list, dock, describeScreen],
  );
  return { slots, info, setActions, setList, setDock };
}
