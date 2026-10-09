import { useEffect, useState } from 'react';

import { usePlatform, useT, type NotificationPermissionState } from '@alavo-daily/common';
import { Button, Card, Icon, IconTile, useToast } from '@alavo-daily/design-system';

export function NotificationPermissionCard() {
  const t = useT();
  const { toast } = useToast();
  const platform = usePlatform();
  const [permission, setPermission] = useState<NotificationPermissionState | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let current = true;
    void platform.notificationPermission().then((state) => current && setPermission(state));
    return () => {
      current = false;
    };
  }, [platform]);

  const allow = () => {
    setAsking(true);
    platform
      .requestNotificationPermission()
      .then(setPermission)
      .catch(() => toast(t('Không bật được thông báo')))
      .finally(() => setAsking(false));
  };

  if (permission === null) return null;
  return (
    <Card padding="lg" className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 lg:flex">
      <IconTile icon="bell-ringing" />
      <div className="min-w-0 flex-1">
        <h2 className="text-title font-semibold">{t('Cho phép thông báo')}</h2>
        <p className="mt-1 text-sm text-text-muted">{t(explanationFor(permission))}</p>
      </div>
      <PermissionAction permission={permission} asking={asking} onAllow={allow} />
    </Card>
  );
}

function PermissionAction({
  permission,
  asking,
  onAllow,
}: {
  permission: NotificationPermissionState;
  asking: boolean;
  onAllow: () => void;
}) {
  const t = useT();
  if (permission === 'prompt') {
    return (
      <Button className="shrink-0 max-lg:col-span-2 max-lg:w-full" disabled={asking} onClick={onAllow}>
        {t('Cho phép')}
      </Button>
    );
  }
  if (permission !== 'granted') return null;
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-sm text-text-muted max-lg:col-span-2">
      <Icon name="check-circle" />
      {t('Đã bật')}
    </span>
  );
}

function explanationFor(permission: NotificationPermissionState): string {
  switch (permission) {
    case 'prompt':
      return 'Alavo Daily cần được phép để gửi nhắc nhở lên thiết bị này.';
    case 'granted':
      return 'Alavo Daily có thể gửi nhắc nhở lên thiết bị này.';
    case 'denied':
      return (
        'Thông báo đang bị chặn. Hãy bật lại trong cài đặt của hệ thống hoặc của trình duyệt, ' +
        'rồi quay lại đây.'
      );
    case 'unsupported':
      return 'Thiết bị hoặc trình duyệt này chưa hỗ trợ thông báo.';
  }
}
