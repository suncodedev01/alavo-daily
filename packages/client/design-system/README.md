# @alavo-daily/design-system

React 19 + Tailwind v4 + shadcn (preset `base-maia`, on Base UI) for Alavo Daily. One visual language for the wide (desktop frame, from 1024px) and narrow (phone frame) layouts.

## Use it

```css
/* app entry CSS */
@import "@alavo-daily/design-system/styles.css";
```

The Vite config needs `@tailwindcss/vite`. The stylesheet declares its own `@source "../"`, so the package's components are scanned automatically. Add `@source "../path/to/your/features";` for the app's own files if Vite's auto-detection does not reach them.

Set `data-theme="light" | "dark"` on `<html>` to force a theme. Without it the theme follows `prefers-color-scheme`.

```tsx
import { Button, AppFrame, useLayout } from '@alavo-daily/design-system';
```

Run `pnpm dev` for the showcase (every component, light/dark, wide/narrow), `pnpm test`, `pnpm typecheck`, `pnpm build:showcase`.

`src/components/ui/` is shadcn vendor code. Do not edit it; wrap it or redefine tokens in `src/styles/index.css`.

## Foundations

| Export | Props |
|---|---|
| `cn(...classes)` | clsx plus tailwind-merge that knows the custom text sizes and shadows |
| `Icon` | `name` (kebab-case), `size` (`sm` 14, `md` 16, `lg` 20, `xl` 24 or a number), `weight` (`regular` or `fill`), `label`. Unknown names render the tag icon. `ICON_REGISTRY`, `iconNames` list what exists. `compass-fill` style names resolve to fill weight. |
| `useLayout()` | returns `'wide'` or `'narrow'` (window width, breakpoint 1024px) |
| `Toaster`, `useToast()` | mount `Toaster` once, call `toast(message)`; shows a pill for 2.2s |

## Controls

| Export | Props |
|---|---|
| `Button` | `variant` primary, outline, ghost, affirm, destructive, destructive-outline; `size` sm, md, lg, icon; `leadingIcon`, `trailingIcon` (icon names, set `data-icon`) |
| `IconButton` | `icon`, `label` (required), `variant` ghost, outline, surface; `size` sm, md, lg; `badge` (notification dot) |
| `Field` | input props, `leadingIcon`, `trailing`, `invalid`, forwards `ref`. Native date and time types are rejected by the type |
| `TextArea` | textarea props, `invalid` |
| `SearchField` | `value`, `onValueChange`, `placeholder`, `label`, `clearLabel` |
| `Stepper` | `value`, `onChange`, `min`, `max`, `step`, `label`, `decrementLabel`, `incrementLabel`, `format` |
| `Switch` | Base UI switch props, `label` |
| `Checkbox` | `checked`, `defaultChecked`, `onCheckedChange`, `disabled`, `label`, children (row label, struck through when checked) |
| `Segmented` | `options` (2 to 4), `value`, `onChange`, `label` |
| `Pill` | button props, `selected`, `leadingIcon` |
| `StatusChip` | `status` open, working, needs_you, your_call, resolved; `label` or children; `labels` map (defaults are Vietnamese) |
| `Meter` | `value` (0 to 1 and above), `tone` normal, warn, over (derived from value when omitted: warn from 0.85, over above 1), `label` |
| `ProgressRing` | `value`, `size`, `strokeWidth`, `tone`, `label`, children (centre content) |
| `Avatar` | `name`, `src`, `size` sm, md, lg |
| `Skeleton` | `className` (size only) |
| `EmptyState` | `icon`, `title`, `description`, `action` |

## Overlays

| Export | Props |
|---|---|
| `Popover` | `trigger` (element), `placement` top or bottom, `align`, `open`, `defaultOpen`, `onOpenChange`, `label`, children |
| `Menu`, `MenuItem`, `MenuSeparator`, `MenuLabel` | `Menu`: `trigger`, `placement`, `align`, `open`, `onOpenChange`. `MenuItem`: `icon`, `hint`, `selected`, `destructive`, `disabled`, `onSelect` |
| `OptionPicker` | `value`, `onChange`, `options` (`{ value, label, hint?, icon? }`), `placement`, `align`, `label`, `placeholder`, `leadingIcon`. Replaces `<select>` |
| `Dialog`, `Sheet`, `ResponsiveDialog` | `open`, `onOpenChange`, `title`, `description`, `footer`, children, `closeLabel`. `ResponsiveDialog` is a `Dialog` when wide and a `Sheet` when narrow |
| `ConfirmDialog` | `open`, `onOpenChange`, `title`, `description`, `confirmLabel`, `cancelLabel`, `onConfirm`, `destructive` |

## Surfaces

| Export | Props |
|---|---|
| `Card`, `CardHeader`, `CardTitle`, `CardBody` | `Card`: `padding` none, sm, md, lg |
| `FloatingCard` | `as`, `tone` surface or raised. The pane recipe (8px inset, rounded-lg, hairline ring, card shadow) |
| `IconTile` | `icon`, `size` sm, md, lg, `tone` neutral, brand, accent, solid |
| `Eyebrow` | `as`. 11px, 600, uppercase, 0.1em tracking |
| `ContextSection` (alias `Collapsible`) | `title`, `trailing`, `open`, `defaultOpen`, `onOpenChange`, children |

## Layout shells

| Export | Props |
|---|---|
| `AppFrame` | `sidebar`, `list`, `dock`, `dockOpen`, `dockLabel`, children (working pane). Dock becomes an overlay panel below 1180px |
| `Sidebar`, `SidebarHeader`, `SidebarGroup`, `SidebarSeparator`, `SidebarFooter` | `Sidebar`: `header`, `footer`, `label`, children. `SidebarGroup`: `label` |
| `NavItem` | `icon`, `label`, `count`, `active`, `render` (for router links) |
| `PaneHeader` | `title`, `leading`, `actions` |
| `PaneBody`, `PageColumn` | `maxWidth` page (1200), detail (640), form (440), full |
| `MobileFrame` | `topBar`, `tabBar`, children (scroll area) |
| `TabBar`, `TabBarItem`, `TabBarAction` | `TabBarItem`: `icon`, `label`, `active`. `TabBarAction`: `icon`, `label`, `showLabel` (explore variant with label under it), `active` |
| `TopBar` | `leading` (usually `ModulePill`), children (icon buttons) |
| `ModulePill` | `icon`, `name`, `variant` chip or row |
