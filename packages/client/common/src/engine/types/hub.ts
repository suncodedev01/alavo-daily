export type ThemeSetting = 'system' | 'light' | 'dark';

export interface Settings {
  language: string;
  theme: ThemeSetting;
  /** How many people the household cooks for. Default servings in plans and shopping lists. */
  householdSize: number;
  /** Module ids pinned to the sidebar and the bottom bar. */
  pinnedModules: string[];
  /** Module ids opened lately, newest first, at most 4. */
  recentModules: string[];
}

export type UpdateSettings = Partial<Settings>;

export interface AppNotification {
  id: string;
  module: string;
  title: string;
  body: string;
  /** Unix milliseconds. */
  createdAt: number;
  read: boolean;
}

export type NotificationRuleKind = 'time' | 'event' | 'always';

export interface NotificationRule {
  id: string;
  module: string;
  /** Natural-text i18n key: Vietnamese text that the UI passes through `t()`. */
  label: string;
  description: string;
  kind: NotificationRuleKind;
  /** `HH:MM`, only for `kind === 'time'`. */
  time: string | null;
  enabled: boolean;
}

export interface UpdateNotificationRule {
  id: string;
  enabled?: boolean;
  time?: string;
}

export type SyncState = 'off' | 'connecting' | 'connected' | 'syncing' | 'offline' | 'conflict';

export interface SyncStatus {
  state: SyncState;
  /** Local changes waiting to be uploaded. */
  pendingEvents: number;
  lastSyncedAt: number | null;
  deviceId: string;
}
