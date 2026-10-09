import type { ReactNode } from 'react';

export type MobileFrameProps = {
  topBar?: ReactNode;
  tabBar?: ReactNode;
  children: ReactNode;
};

export function MobileFrame({ topBar, tabBar, children }: MobileFrameProps) {
  return (
    <div className="pt-safe flex h-dvh flex-col overflow-hidden bg-paper text-text-primary">
      {topBar ? <header className="shrink-0 px-4 pt-1 pb-2">{topBar}</header> : null}
      <main className="scrollbar-none grid min-h-0 flex-1 auto-rows-max grid-cols-1 content-start gap-4 overflow-y-auto px-4 pt-2 pb-6">
        {children}
      </main>
      {tabBar}
    </div>
  );
}
