import { useEngineQuery, usePlatform, type AppNotification } from '@alavo-daily/common';
import { useEffect, useEffectEvent, useRef } from 'react';

import { budgetNoticeOptions, unannouncedBudgetNotices } from '../logic/budgetNotices';

/**
 * Shows each budget warning that appears while the app is open as a phone notification with
 * buttons. Warnings that were already there when the app opened are not shown.
 */
export function useBudgetNoticeBroadcast(): void {
  const platform = usePlatform();
  const notices = useEngineQuery('hub.list_notifications').data;
  const seen = useRef<ReadonlySet<string> | null>(null);
  const supported = platform.capabilities.notificationActions;
  const announce = useEffectEvent((current: AppNotification[]) => {
    const before = seen.current;
    seen.current = new Set(current.map((notice) => notice.id));
    if (!before) return;
    unannouncedBudgetNotices(current, before).forEach(
      (notice) => void platform.notify(notice.title, notice.body, budgetNoticeOptions(notice)),
    );
  });
  useEffect(() => {
    if (supported && notices) announce(notices);
  }, [supported, notices]);
}
