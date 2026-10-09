import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { usePlatform, type ScheduledNotification } from '../platform';

type Sources = Record<string, ScheduledNotification[]>;

interface ReminderRegistry {
  report(source: string, items: ScheduledNotification[]): void;
  withdraw(source: string): void;
}

const RegistryContext = createContext<ReminderRegistry | null>(null);

const ID_MODULUS = 2 ** 31 - 1;

/** A stable positive 31-bit id for a reminder key such as `morning:2026-10-10:0`. */
export function notificationId(key: string): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 16777619) >>> 0;
  }
  return (hash % (ID_MODULUS - 1)) + 1;
}

function sameItems(first: ScheduledNotification[], second: ScheduledNotification[]): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function mergeSources(sources: Sources): ScheduledNotification[] {
  return Object.values(sources)
    .flat()
    .sort((a, b) => a.at - b.at || a.id - b.id);
}

/**
 * Collects the reminders every module wants and hands the platform one merged list, because a
 * schedule call replaces whatever was scheduled before. Modules never call the platform directly.
 */
export function ReminderProvider({ children }: { children: ReactNode }) {
  const platform = usePlatform();
  const [sources, setSources] = useState<Sources>({});
  const registry = useMemo<ReminderRegistry>(
    () => ({
      report: (source, items) =>
        setSources((current) =>
          current[source] && sameItems(current[source], items) ? current : { ...current, [source]: items },
        ),
      withdraw: (source) =>
        setSources((current) => {
          const { [source]: _removed, ...rest } = current;
          return rest;
        }),
    }),
    [],
  );
  useEffect(() => {
    void platform.scheduleNotifications(mergeSources(sources));
  }, [platform, sources]);
  return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>;
}

/**
 * Tells the app which notifications `source` wants. Call it with the full list each time; an
 * empty list means none. The reminders of every source are merged and scheduled together.
 */
export function useReminderSource(source: string, items: ScheduledNotification[] | null): void {
  const registry = useContext(RegistryContext);
  if (!registry) throw new Error('useReminderSource must be used inside <ReminderProvider>');
  useEffect(() => {
    if (items) registry.report(source, items);
  }, [registry, source, items]);
  useEffect(() => () => registry.withdraw(source), [registry, source]);
}
