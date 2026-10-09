import { useActionTypeRegistration } from '../hooks/useActionTypeRegistration';
import { useBudgetNoticeBroadcast } from '../hooks/useBudgetNoticeBroadcast';
import { useNotificationActionListener } from '../hooks/useNotificationActionListener';
import { useSnoozedReminders } from '../hooks/useSnoozedReminders';

/** Gives phone notifications their buttons and does what the buttons ask. Draws nothing. */
export function NotificationActions() {
  const snooze = useSnoozedReminders();
  useActionTypeRegistration();
  useNotificationActionListener(snooze);
  useBudgetNoticeBroadcast();
  return null;
}
