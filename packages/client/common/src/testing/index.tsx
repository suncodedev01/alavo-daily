import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';

import {
  EngineCallError,
  EngineProvider,
  isReadCommand,
  type CallArgs,
  type CommandName,
  type CommandPayload,
  type CommandResult,
  type EngineClient,
  type EngineEvent,
} from '../engine';
import { I18nProvider, createI18n } from '../i18n';
import {
  PlatformProvider,
  type NotificationActionEvent,
  type NotificationActionHandler,
  type NotificationActionType,
  type NotifyOptions,
  type PlatformServices,
  type ScheduledNotification,
} from '../platform';
import { ReminderProvider } from '../reminders';

export type Handlers = {
  [K in CommandName]?: (payload: CommandPayload<K>) => CommandResult<K> | Promise<CommandResult<K>>;
};

/** An engine that answers from plain functions, for component tests. */
export class FakeEngineClient implements EngineClient {
  readonly ready = Promise.resolve({ deviceId: 'test-device' });
  readonly calls: { command: string; payload: unknown }[] = [];
  private readonly listeners = new Set<(event: EngineEvent) => void>();

  constructor(private readonly handlers: Handlers = {}) {}

  on<K extends CommandName>(
    command: K,
    handler: (payload: CommandPayload<K>) => CommandResult<K> | Promise<CommandResult<K>>,
  ): this {
    (this.handlers as Record<string, unknown>)[command] = handler;
    return this;
  }

  async call<K extends CommandName>(command: K, ...args: CallArgs<K>): Promise<CommandResult<K>> {
    this.calls.push({ command, payload: args[0] });
    const handler = this.handlers[command] as
      | ((payload: unknown) => CommandResult<K> | Promise<CommandResult<K>>)
      | undefined;
    if (!handler) throw new EngineCallError('unknown_command', `no handler for ${command}`);
    const result = await handler(args[0]);
    if (!isReadCommand(command)) this.listeners.forEach((listener) => listener({ command }));
    return result;
  }

  subscribe(listener: (event: EngineEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  callsTo(command: CommandName): unknown[] {
    return this.calls.filter((call) => call.command === command).map((call) => call.payload);
  }
}

export function createFakePlatform(overrides: Partial<PlatformServices> = {}): PlatformServices {
  return {
    capabilities: {
      backgroundReminders: false,
      keepAwake: true,
      importFromUrl: false,
      googleSync: true,
      notificationActions: false,
    },
    keepAwake: async () => () => undefined,
    saveTextFile: async () => undefined,
    openLink: async () => undefined,
    notify: async () => true,
    scheduleNotifications: async () => undefined,
    registerNotificationActions: async () => undefined,
    onNotificationAction: () => () => undefined,
    notificationPermission: async () => 'granted',
    requestNotificationPermission: async () => 'granted',
    fetchPage: async () => {
      throw new Error('fetchPage is not available in tests');
    },
    googleAuth: null,
    ...overrides,
  };
}

export interface ActionablePlatform {
  platform: PlatformServices;
  registered: NotificationActionType[];
  shown: { title: string; body: string; options?: NotifyOptions }[];
  scheduled: ScheduledNotification[][];
  listenerCount(): number;
  /** Presses a button on a notification, as the operating system would report it. */
  press(actionId: string, event?: Partial<NotificationActionEvent>): void;
}

/** A platform whose notifications have buttons, and that records what it was asked to show. */
export function createActionablePlatform(overrides: Partial<PlatformServices> = {}): ActionablePlatform {
  const listeners = new Set<NotificationActionHandler>();
  const registered: NotificationActionType[] = [];
  const shown: ActionablePlatform['shown'] = [];
  const scheduled: ScheduledNotification[][] = [];
  const platform = createFakePlatform({
    capabilities: { ...createFakePlatform().capabilities, notificationActions: true },
    notify: async (title, body, options) => {
      shown.push({ title, body, options });
      return true;
    },
    scheduleNotifications: async (items) => {
      scheduled.push(items);
    },
    registerNotificationActions: async (types) => {
      registered.push(...types);
    },
    onNotificationAction: (handler) => {
      listeners.add(handler);
      return () => void listeners.delete(handler);
    },
    ...overrides,
  });
  const press = (actionId: string, event: Partial<NotificationActionEvent> = {}) =>
    listeners.forEach((listener) =>
      listener({ actionId, actionTypeId: null, notificationId: 1, title: '', body: '', data: {}, ...event }),
    );
  return { platform, registered, shown, scheduled, press, listenerCount: () => listeners.size };
}

export interface ProviderOptions {
  handlers?: Handlers;
  engine?: FakeEngineClient;
  platform?: PlatformServices;
  language?: string;
}

/** Renders `ui` inside the engine, platform and i18n providers every screen needs. */
export function renderWithProviders(
  ui: ReactElement,
  options: ProviderOptions = {},
): RenderResult & { engine: FakeEngineClient } {
  const engine = options.engine ?? new FakeEngineClient(options.handlers);
  const platform = options.platform ?? createFakePlatform();
  const i18n = createI18n(options.language ?? 'vi');
  const result = render(
    <EngineProvider client={engine}>
      <PlatformProvider platform={platform}>
        <I18nProvider i18n={i18n}>
          <ReminderProvider>{ui}</ReminderProvider>
        </I18nProvider>
      </PlatformProvider>
    </EngineProvider>,
  );
  return Object.assign(result, { engine });
}
