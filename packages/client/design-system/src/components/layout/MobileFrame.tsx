import type { ReactNode } from 'react';
import { useKeyboardInset } from '@/hooks/keyboardInset';
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen';

export type MobileFrameProps = {
  topBar?: ReactNode;
  tabBar?: ReactNode;
  children: ReactNode;
};

export function MobileFrame({ topBar, tabBar, children }: MobileFrameProps) {
  useKeyboardInset();
  const keyboardOpen = useKeyboardOpen();
  return (
    <div className="pt-safe flex h-dvh flex-col overflow-hidden bg-paper text-text-primary">
      {topBar ? <header className="shrink-0 px-4 pt-1 pb-2">{topBar}</header> : null}
      <main className="scrollbar-none grid min-h-0 flex-1 scroll-pb-24 overscroll-contain auto-rows-max grid-cols-1 content-start gap-4 overflow-y-auto px-4 pt-2 pb-[calc(1.5rem+var(--keyboard-inset,0px))]">
        {children}
      </main>
      {keyboardOpen ? null : tabBar}
    </div>
  );
}
