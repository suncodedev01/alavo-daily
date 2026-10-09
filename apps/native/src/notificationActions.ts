import type {
  NotificationActionEvent,
  NotificationActionHandler,
  NotificationActionType,
} from '@alavo-daily/common';
import { onAction, registerActionTypes, type ActionType } from '@tauri-apps/plugin-notification';

export function registerActions(types: NotificationActionType[]): Promise<void> {
  return registerActionTypes(types.map(toPluginType));
}

export function listenForActions(handler: NotificationActionHandler): () => void {
  const listener = onAction((payload) => {
    const event = readActionEvent(payload);
    if (event) handler(event);
  });
  return () => void listener.then((registered) => registered.unregister()).catch(() => undefined);
}

function toPluginType({ id, actions }: NotificationActionType): ActionType {
  return { id, actions: actions.map(({ id: actionId, label }) => ({ id: actionId, title: label })) };
}

/**
 * The plugin types the payload as the notification itself, but a button press arrives as
 * `{ actionId, notification }`. Anything else is ignored.
 */
export function readActionEvent(payload: unknown): NotificationActionEvent | null {
  const press = asRecord(payload);
  if (typeof press?.actionId !== 'string') return null;
  const notification = asRecord(press.notification) ?? {};
  return {
    actionId: press.actionId,
    actionTypeId: textOrNull(notification.actionTypeId),
    notificationId: typeof notification.id === 'number' ? notification.id : null,
    title: textOrNull(notification.title) ?? '',
    body: textOrNull(notification.body) ?? '',
    data: readData(notification.extra),
  };
}

function readData(extra: unknown): Record<string, string> {
  const entries = Object.entries(asRecord(extra) ?? {}).filter(([, value]) => typeof value === 'string');
  return Object.fromEntries(entries) as Record<string, string>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}
