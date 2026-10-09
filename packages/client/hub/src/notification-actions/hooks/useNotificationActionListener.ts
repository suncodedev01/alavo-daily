import { useEngine, usePlatform, useT, type NotificationActionEvent } from '@alavo-daily/common';
import { toDateText } from '@alavo-daily/common/format';
import { useToast } from '@alavo-daily/design-system';
import { useEffect, useEffectEvent } from 'react';
import { useNavigate } from 'react-router';

import { handleNotificationAction } from '../logic/handleAction';

/** Runs what a notification button asks for. Listens only where notifications have buttons. */
export function useNotificationActionListener(snooze: (event: NotificationActionEvent) => void): void {
  const platform = usePlatform();
  const engine = useEngine();
  const navigate = useNavigate();
  const { toast } = useToast();
  const t = useT();
  const supported = platform.capabilities.notificationActions;
  const run = useEffectEvent((event: NotificationActionEvent) =>
    handleNotificationAction(event, {
      engine,
      navigate,
      snooze,
      announce: toast,
      t,
      today: () => toDateText(new Date()),
    }),
  );
  useEffect(() => {
    if (!supported) return undefined;
    return platform.onNotificationAction((event) => void run(event));
  }, [platform, supported]);
}
