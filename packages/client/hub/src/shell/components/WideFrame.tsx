import { useState, type ReactNode } from 'react';

import { useT } from '@alavo-daily/common';
import { AppFrame, IconButton, PaneBody, PaneHeader } from '@alavo-daily/design-system';

import { NotificationBell } from '../../notifications';
import type { ShellState } from '../types';
import { WideSidebar } from './WideSidebar';

const DOCK_OVERLAY_BREAKPOINT_PX = 1180;

export function WideFrame({ shell, children }: { shell: ShellState; children: ReactNode }) {
  const t = useT();
  const { info } = shell;
  const [dockOpen, setDockOpen] = useState(() => window.innerWidth > DOCK_OVERLAY_BREAKPOINT_PX);
  const list = info?.hasList ? (
    <div
      ref={shell.setList}
      role="region"
      aria-label={info.listLabel ?? t('Danh sách')}
      className="flex min-h-0 flex-1 flex-col"
    />
  ) : undefined;
  const dock = info?.hasDock ? <div ref={shell.setDock} className="contents" /> : undefined;
  return (
    <AppFrame sidebar={<WideSidebar />} list={list} dock={dock} dockOpen={dockOpen}>
      <PaneHeader
        title={info?.title ?? ''}
        actions={
          <>
            <div ref={shell.setActions} className="contents" />
            <NotificationBell />
            {info?.hasDock ? (
              <IconButton
                icon="list"
                label={t('Bật/tắt bảng bên phải')}
                onClick={() => setDockOpen((open) => !open)}
              />
            ) : null}
          </>
        }
      />
      <PaneBody>{children}</PaneBody>
    </AppFrame>
  );
}
