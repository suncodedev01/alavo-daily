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
}

/** A shortcut offered by the hub's "quick add" menu. */
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  /** Where to go; the screen opens its own "new" dialog when it sees `?new=1`. */
  path: string;
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
  /** Extra content under the module's navigation in the wide sidebar (wallets, today's meals). */
  sidebarExtra?: ComponentType;
  /**
   * Drawn once for the whole session, outside any screen, and should render nothing. A module
   * uses it to keep its reminders scheduled while the app is open.
   */
  background?: ComponentType;
}
