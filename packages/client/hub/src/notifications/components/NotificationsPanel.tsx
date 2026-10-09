import { useEngineMutation, useLanguage, useT, type AppNotification } from '@alavo-daily/common';
import { Button, EmptyState, IconTile, cn } from '@alavo-daily/design-system';

import { useModules } from '../../module-registry';
import { todayText } from '../../clock';
import { LinkButton } from '../../router-links';
import { formatNotificationTime } from '../logic/formatNotificationTime';
import { NOTIFICATION_SETTINGS_PATH } from '../../module-navigation';

export interface NotificationsPanelProps {
  notifications: AppNotification[];
  onNavigate: () => void;
}

export function NotificationsPanel({ notifications, onNavigate }: NotificationsPanelProps) {
  const t = useT();
  const markRead = useEngineMutation('hub.mark_notifications_read');
  const unreadCount = notifications.filter((item) => !item.read).length;
  return (
    <div className="grid">
      <div className="flex items-center gap-2 py-1 pr-1 pl-3">
        <h2 className="mr-auto text-sm font-semibold">{t('Thông báo')}</h2>
        <Button variant="ghost" size="sm" disabled={unreadCount === 0} onClick={() => markRead.mutate({})}>
          {t('Đánh dấu đã đọc')}
        </Button>
      </div>
      <NotificationList notifications={notifications} />
      <div className="mt-1 border-t border-line-hairline pt-1">
        <LinkButton
          variant="ghost"
          leadingIcon="gear"
          className="w-full justify-start"
          to={NOTIFICATION_SETTINGS_PATH}
          onNavigate={onNavigate}
        >
          {t('Cài đặt thông báo')}
        </LinkButton>
      </div>
    </div>
  );
}

function NotificationList({ notifications }: { notifications: AppNotification[] }) {
  const t = useT();
  if (notifications.length === 0) {
    return <EmptyState icon="bell" title={t('Chưa có thông báo nào')} />;
  }
  return (
    <ul className="max-h-96 overflow-y-auto">
      {notifications.map((item) => (
        <NotificationRow key={item.id} item={item} />
      ))}
    </ul>
  );
}

function NotificationRow({ item }: { item: AppNotification }) {
  const t = useT();
  const language = useLanguage();
  const modules = useModules();
  const owner = modules.find((manifest) => manifest.id === item.module);
  const meta = [owner ? t(owner.name) : null, formatNotificationTime(item.createdAt, todayText(), language)];
  return (
    <li className={cn('flex gap-3 rounded-lg p-3', !item.read && 'bg-accent')}>
      <IconTile icon={owner?.icon ?? 'bell'} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{item.title}</p>
        <p className="text-xs text-text-secondary">{item.body}</p>
        <p className="mt-1 text-meta text-text-muted">{meta.filter(Boolean).join(' · ')}</p>
      </div>
    </li>
  );
}
