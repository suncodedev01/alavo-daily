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
  /** What the notice is about: the category id of a budget alert, otherwise null. */
  subjectId: string | null;
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

/**
 * `off`: not connected. `idle`: connected and nothing running. `syncing`: a round is running.
 * `needs_login`: the person has to sign in to Google again. `offline`: no network. `error`: the
 * last round failed for another reason.
 */
export type SyncState = 'off' | 'idle' | 'syncing' | 'needs_login' | 'offline' | 'error';

export interface SyncStatus {
  state: SyncState;
  /** Local changes waiting to be uploaded. */
  pendingEvents: number;
  lastSyncedAt: number | null;
  deviceId: string;
  accountEmail: string | null;
  /** The reason the last round failed, in words fit for the person. */
  error: string | null;
  /** Rows changed on two devices that wait for the person to choose a version. */
  conflictCount: number;
}

export interface ReportSyncState {
  state: SyncState;
  accountEmail?: string | null;
  error?: string | null;
  /** Marks a finished round: the engine stamps the last sync time. */
  synced?: boolean;
}

export type SyncAction = 'insert' | 'update' | 'delete';

/** One change as it travels between devices: a row of the change log. */
export interface SyncEvent {
  eventId: string;
  module: string;
  entityType: string;
  entityId: string;
  action: SyncAction;
  changedFields: string[];
  payload: Record<string, unknown>;
  deviceId: string;
  hlc: number;
}

export interface ApplyRemoteInput {
  deviceId: string;
  /** Events from another device's file. Anything malformed is skipped by the engine. */
  events: unknown[];
  /** Identifies the file version; send it only with the last batch of a file. */
  marker?: string;
}

export interface ApplyRemoteReport {
  applied: number;
  unchanged: number;
  conflicts: number;
  ignored: number;
  highWater: number;
}

export interface SyncPeer {
  deviceId: string;
  highWaterHlc: number;
  marker: string | null;
  appliedAt: number;
}

export type ConflictRow = Record<string, unknown>;

export interface SyncConflict {
  id: string;
  module: string;
  entityType: string;
  entityId: string;
  /** The row as this device has it. */
  local: ConflictRow;
  /** The row as it would be with the other device's change. */
  remote: ConflictRow;
  remoteHlc: number;
  remoteDeviceId: string;
  createdAt: number;
}

export interface ImportPreview {
  rows: number;
  tables: number;
  exportedAt: number | null;
}

export interface ImportSummary {
  rows: number;
  applied: number;
  unchanged: number;
  skipped: number;
}
