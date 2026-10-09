import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** What a screen tells the app shell about itself so the shell can lay out the frame. */
export interface ScreenInfo {
  title: string;
  hasList: boolean;
  hasDock: boolean;
  /** Accessible name of the list pane, e.g. "Danh sách giao dịch". */
  listLabel?: string;
  /** On a narrow layout, which of the two the person sees first. */
  narrowShows: 'list' | 'main';
  /** The screen draws its own heading, so the phone frame skips the title row. */
  hideNarrowTitle?: boolean;
}

/** Provided by the hub. Modules never import the hub; they only use `Screen`. */
export interface ShellSlots {
  /** Right side of the pane header, where a screen puts its primary action. */
  actions: HTMLElement | null;
  list: HTMLElement | null;
  dock: HTMLElement | null;
  /** Must keep the same identity between renders. Returns the cleanup function. */
  describeScreen(info: ScreenInfo): () => void;
}

export const ShellSlotsContext = createContext<ShellSlots | null>(null);

export interface ScreenProps {
  title: string;
  /** A fourth pane between the sidebar and the working pane. */
  list?: ReactNode;
  listLabel?: string;
  /** The context panel on the right. */
  dock?: ReactNode;
  actions?: ReactNode;
  narrowShows?: 'list' | 'main';
  hideNarrowTitle?: boolean;
  children: ReactNode;
}

/**
 * One screen of a module. `children` is the working pane; `actions`, `list` and `dock` are
 * rendered into the shell's panes through portals, so they keep this screen's React context
 * and state while living in the shell's layout.
 */
export function Screen({
  title,
  list,
  listLabel,
  dock,
  actions,
  narrowShows = 'main',
  hideNarrowTitle = false,
  children,
}: ScreenProps) {
  const slots = useContext(ShellSlotsContext);
  const hasList = list != null;
  const hasDock = dock != null;
  const describe = slots?.describeScreen;
  useEffect(
    () => describe?.({ title, hasList, hasDock, listLabel, narrowShows, hideNarrowTitle }),
    [describe, title, hasList, hasDock, listLabel, narrowShows, hideNarrowTitle],
  );
  return (
    <>
      {slots?.actions && actions ? createPortal(actions, slots.actions) : null}
      {slots?.list && list ? createPortal(list, slots.list) : null}
      {slots?.dock && dock ? createPortal(dock, slots.dock) : null}
      {children}
    </>
  );
}
