import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FloatingCard } from '../surfaces/FloatingCard';

export type AppFrameProps = {
  sidebar: ReactNode;
  list?: ReactNode;
  dock?: ReactNode;
  dockOpen?: boolean;
  dockLabel?: string;
  children: ReactNode;
};

const DOCK_CLASS =
  'ml-0 flex w-90 flex-none flex-col transition-all duration-200 ease-in-out motion-reduce:transition-none max-dock:fixed max-dock:top-0 max-dock:right-0 max-dock:bottom-0 max-dock:z-10 max-dock:m-2 max-dock:shadow-overlay';

const DOCK_CLOSED_CLASS =
  'pointer-events-none -ml-2 w-0 opacity-0 shadow-none max-dock:ml-0 max-dock:translate-x-full max-dock:shadow-none';

export function AppFrame({
  sidebar,
  list,
  dock,
  dockOpen = false,
  dockLabel = 'Bảng ngữ cảnh',
  children,
}: AppFrameProps) {
  return (
    <div className="flex h-dvh overflow-hidden bg-paper text-text-primary">
      {sidebar}
      {list ? (
        <FloatingCard
          as="aside"
          tone="raised"
          aria-label="Danh sách"
          className="mr-0 flex w-85 flex-none flex-col max-compact:w-70"
        >
          {list}
        </FloatingCard>
      ) : null}
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      {dock ? (
        <FloatingCard
          as="aside"
          aria-label={dockLabel}
          aria-hidden={!dockOpen}
          inert={!dockOpen}
          data-open={dockOpen ? '' : undefined}
          className={cn(DOCK_CLASS, !dockOpen && DOCK_CLOSED_CLASS)}
        >
          <div className="min-h-0 flex-1 overflow-y-auto">{dock}</div>
        </FloatingCard>
      ) : null}
    </div>
  );
}
