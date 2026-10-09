import type { ReactNode } from 'react';

import { ShellSlotsContext } from '@alavo-daily/common';
import { useLayout } from '@alavo-daily/design-system';

import { NarrowFrame } from './NarrowFrame';
import { useShellSlots } from '../hooks/useShellSlots';
import { WideFrame } from './WideFrame';

/** The app frame. Screens fill its panes through `ShellSlotsContext` (ADR 0014). */
export function ShellFrame({ children }: { children: ReactNode }) {
  const layout = useLayout();
  const shell = useShellSlots();
  const Frame = layout === 'wide' ? WideFrame : NarrowFrame;
  return (
    <ShellSlotsContext.Provider value={shell.slots}>
      <Frame shell={shell}>{children}</Frame>
    </ShellSlotsContext.Provider>
  );
}
