import { createContext, useContext, type ReactNode } from 'react';

/** What the current platform can do. Screens read these instead of checking which app they run in. */
export interface Capabilities {
  /** Can show a reminder at a set time while the app is closed. */
  backgroundReminders: boolean;
  /** Can keep the screen on while cooking. */
  keepAwake: boolean;
  /** Can fetch a recipe page from a web address (the browser blocks this without a server). */
  importFromUrl: boolean;
  /** Can sign in to Google Drive for sync. */
  googleSync: boolean;
}

/** A notification to show at a set time. The id lets a later schedule replace this one. */
export interface ScheduledNotification {
  id: number;
  /** Unix time in milliseconds. */
  at: number;
  title: string;
  body: string;
}

export type NotificationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface GoogleSession {
  email: string | null;
}

/** Google sign-in for Drive sync. Each platform signs in its own way. */
export interface GoogleAuth {
  /** Opens Google sign-in and resolves once the person is connected. */
  signIn(): Promise<GoogleSession>;
  /** The signed-in account, or null when nobody is connected. */
  session(): Promise<GoogleSession | null>;
  /** An access token for Drive, or null when the person has to sign in again. */
  accessToken(): Promise<string | null>;
  signOut(): Promise<void>;
}

export interface PlatformServices {
  capabilities: Capabilities;
  /** Keeps the screen on until the returned function is called. */
  keepAwake(): Promise<() => void>;
  /** Hands a text file to the user (the data export). */
  saveTextFile(filename: string, content: string): Promise<void>;
  openLink(url: string): Promise<void>;
  /** Shows a notification now. Scheduling for later is added per platform. */
  notify(title: string, body: string): Promise<boolean>;
  /**
   * Replaces every notification scheduled earlier with `items`. With `backgroundReminders` they
   * also show while the app is closed; without it only while the app is open.
   */
  scheduleNotifications(items: ScheduledNotification[]): Promise<void>;
  notificationPermission(): Promise<NotificationPermissionState>;
  /** Asks the person for permission. Call it from a button press, never on load. */
  requestNotificationPermission(): Promise<NotificationPermissionState>;
  /** The HTML of a web page, for recipe import. Rejects where `capabilities.importFromUrl` is false. */
  fetchPage(url: string): Promise<string>;
  /** Null where `capabilities.googleSync` is false. */
  googleAuth: GoogleAuth | null;
}

const PlatformContext = createContext<PlatformServices | null>(null);

export function PlatformProvider({
  platform,
  children,
}: {
  platform: PlatformServices;
  children: ReactNode;
}) {
  return <PlatformContext.Provider value={platform}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformServices {
  const platform = useContext(PlatformContext);
  if (!platform) throw new Error('usePlatform must be used inside <PlatformProvider>');
  return platform;
}

export { createInPageScheduler } from './inPageScheduler';
export { createWebPlatform, type WebPlatformOptions } from './web';
export {
  DRIVE_FILE_SCOPE,
  createWebGoogleAuth,
  type GoogleOAuth2,
  type WebGoogleAuthOptions,
} from './webGoogleAuth';
