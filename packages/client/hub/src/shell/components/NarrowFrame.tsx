import { useState, type ReactNode } from 'react';

import { useT } from '@alavo-daily/common';
import { MobileFrame, ModulePill, TopBar } from '@alavo-daily/design-system';

import { ModuleSwitcherSheet, useCurrentModule } from '../../module-navigation';
import { NotificationBell } from '../../notifications';
import { SyncNowButton } from '../../sync-status';
import { NarrowTabBar } from './TabBars';
import type { ShellState } from '../types';

export function NarrowFrame({ shell, children }: { shell: ShellState; children: ReactNode }) {
  const t = useT();
  const current = useCurrentModule();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { info } = shell;
  const showsList = Boolean(info?.hasList && info.narrowShows === 'list');
  return (
    <MobileFrame
      topBar={
        <TopBar
          leading={
            <ModulePill
              icon={current.icon}
              name={t(current.name)}
              aria-label={`${t('Chuyển ứng dụng')}: ${t(current.name)}`}
              onClick={() => setSwitcherOpen(true)}
            />
          }
        >
          <SyncNowButton />
          <NotificationBell />
        </TopBar>
      }
      tabBar={<NarrowTabBar manifest={current} />}
    >
      <div className={`flex items-center gap-2 px-1 ${info?.hideNarrowTitle ? 'has-[div:empty]:hidden' : ''}`}>
        {info?.hideNarrowTitle ? null : (
          <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold">{info?.title ?? ''}</h1>
        )}
        <div ref={shell.setActions} className="flex shrink-0 items-center gap-2 empty:hidden" />
      </div>
      {info?.hasList ? (
        <div
          ref={shell.setList}
          role="region"
          aria-label={info.listLabel ?? t('Danh sách')}
          hidden={!showsList}
          className="grid gap-2"
        />
      ) : null}
      <div hidden={showsList} className="contents">
        {children}
      </div>
      <ModuleSwitcherSheet current={current} open={switcherOpen} onOpenChange={setSwitcherOpen} />
    </MobileFrame>
  );
}
