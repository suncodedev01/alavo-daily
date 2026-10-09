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
export { createWebPlatform } from './web';
