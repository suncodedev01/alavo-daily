import type { ComponentType, ReactElement } from 'react';

/** One entry in a module's navigation: a sidebar row on wide layouts, a tab on narrow ones. */
export interface ModuleView {
  id: string;
  /** Natural-text i18n key. */
  label: string;
  /** Phosphor icon name in kebab-case. */
  icon: string;
  /** Absolute path, e.g. `/recipes/plan`. */
  path: string;
  /** Show as a tab in the bottom bar (at most four per module; the rest stay in the sidebar). */
  tab?: boolean;
  /** Lives under the module's "Khác" screen instead of the sidebar and tab bar, which keep "Khác" lit. */
  more?: boolean;
}

/** A shortcut offered by the hub's "quick add" menu. */
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  /** Where to go; the screen opens its own "new" dialog when it sees `?new=1`. */
  path: string;
  /** Shorter label under the round middle button of the tab bar. */
  tabLabel?: string;
}

/** What the props of a dialog opened from the "Khác" screen look like. */
export interface MoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** What a row of the "Khác" screen does when pressed. */
export type MoreTarget =
  | { screen: string }
  | { dialog: ComponentType<MoreDialogProps> }
  | { useAction: () => () => void };

export interface MoreItem {
  id: string;
  /** Natural-text i18n key. */
  label: string;
  icon: string;
  /** Natural-text i18n key, shown under the label. */
  description?: string;
  /** Text worked out from data, such as "3 công thức bạn đã đánh dấu". Called as a hook. */
  useDescription?: () => string | undefined;
  target: MoreTarget;
}

export interface MoreSection {
  id: string;
  /** Natural-text i18n key. */
  title: string;
  items: MoreItem[];
}

export interface ModuleRoute {
  /** Path pattern relative to the router root, e.g. `/recipes/plan` or `/recipes/list/:id?`. */
  path: string;
  element: ReactElement;
  /** Drawn without the sidebar, header and tab bar, e.g. the cooking mode. */
  fullscreen?: boolean;
}

/**
 * How a module introduces itself to the hub. The sidebar, the Explore screen, the module
 * switcher and the routes are all generated from the list of manifests, so adding a module
 * never means editing the hub.
 */
export interface ModuleManifest {
  /** Stable id, also the table-name prefix and the first path segment. */
  id: string;
  /** Natural-text i18n key. */
  name: string;
  icon: string;
  /** Natural-text i18n key. */
  description: string;
  views: ModuleView[];
  routes: ModuleRoute[];
  quickActions?: QuickAction[];
  /** The sections of the module's "Khác" screen. The hub draws it; the module never builds that screen. */
  more?: { sections: MoreSection[] };
  /** Extra content under the module's navigation in the wide sidebar (wallets, today's meals). */
  sidebarExtra?: ComponentType;
  /**
   * Drawn once for the whole session, outside any screen, and should render nothing. A module
   * uses it to keep its reminders scheduled while the app is open.
   */
  background?: ComponentType;
}
