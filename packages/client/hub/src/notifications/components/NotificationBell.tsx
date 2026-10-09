import { useState } from 'react';

import { useEngineQuery, useT, type AppNotification } from '@alavo-daily/common';
import { IconButton, Popover, Sheet, useLayout } from '@alavo-daily/design-system';

import { NotificationsPanel } from './NotificationsPanel';

function newestFirst(notifications: AppNotification[]): AppNotification[] {
  return [...notifications].sort((a, b) => b.createdAt - a.createdAt);
}

export function NotificationBell() {
  const t = useT();
  const layout = useLayout();
  const [open, setOpen] = useState(false);
  const query = useEngineQuery('hub.list_notifications');
  const notifications = newestFirst(query.data ?? []);
  const unreadCount = notifications.filter((item) => !item.read).length;
  const label =
    unreadCount > 0 ? t('Thông báo, {{count}} chưa đọc', { count: unreadCount }) : t('Thông báo');
  const panel = <NotificationsPanel notifications={notifications} onNavigate={() => setOpen(false)} />;
  if (layout === 'narrow') {
    return (
      <>
        <IconButton icon="bell" label={label} badge={unreadCount > 0} onClick={() => setOpen(true)} />
        <Sheet open={open} onOpenChange={setOpen} title={t('Thông báo')}>
          {panel}
        </Sheet>
      </>
    );
  }
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label={t('Thông báo')}
      align="end"
      className="w-96"
      trigger={<IconButton icon="bell" label={label} badge={unreadCount > 0} />}
    >
      {panel}
    </Popover>
  );
}
