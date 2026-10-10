export { cn } from './lib/utils';
export {
  DEFAULT_TEXTS,
  DesignSystemTextsProvider,
  useDesignSystemTexts,
  type DesignSystemTexts,
} from './lib/texts';

export { Icon, resolveIcon, type IconProps, type IconSize, type IconWeight } from './components/foundations/Icon';
export { ICON_REGISTRY, iconNames, MOCKUP_ICON_NAMES } from './components/foundations/iconRegistry';
export { useKeyboardOpen } from './hooks/useKeyboardOpen';
export { useLayout, WIDE_BREAKPOINT_PX, type Layout } from './hooks/useLayout';
export { Toaster, useToast, TOAST_DURATION_MS } from './components/foundations/Toaster';

export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './components/controls/Button';
export {
  IconButton,
  type IconButtonProps,
  type IconButtonSize,
  type IconButtonVariant,
} from './components/controls/IconButton';
export { Field, TextArea, type FieldProps, type TextAreaProps } from './components/controls/Field';
export { SearchField, type SearchFieldProps } from './components/controls/SearchField';
export { Stepper, type StepperProps } from './components/controls/Stepper';
export { Switch, type SwitchProps } from './components/controls/Switch';
export { Checkbox, type CheckboxProps } from './components/controls/Checkbox';
export { Segmented, type SegmentedOption, type SegmentedProps } from './components/controls/Segmented';
export { Pill, type PillProps } from './components/controls/Pill';
export {
  StatusChip,
  DEFAULT_STATUS_LABELS,
  type Status,
  type StatusChipProps,
} from './components/controls/StatusChip';
export { Meter, toneForValue, type MeterProps, type MeterTone } from './components/controls/Meter';
export { ProgressRing, type ProgressRingProps } from './components/controls/ProgressRing';
export { Avatar, initialsOf, type AvatarProps, type AvatarSize } from './components/controls/Avatar';
export { Skeleton, type SkeletonProps } from './components/controls/Skeleton';
export { EmptyState, type EmptyStateProps } from './components/controls/EmptyState';

export {
  Menu,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  type Alignment,
  type MenuItemProps,
  type MenuProps,
  type Placement,
} from './components/overlays/Menu';
export { Popover, type PopoverProps } from './components/overlays/Popover';
export { OptionPicker, type OptionPickerProps, type PickerOption } from './components/overlays/OptionPicker';
export { ReorderList, type ReorderItem, type ReorderListProps } from './components/lists/ReorderList';
export { moveItem } from './components/lists/reorder';
export { Dialog, type DialogProps } from './components/overlays/Dialog';
export { Sheet, type SheetProps } from './components/overlays/Sheet';
export { ResponsiveDialog, type ResponsiveDialogProps } from './components/overlays/ResponsiveDialog';
export { ConfirmDialog, type ConfirmDialogProps } from './components/overlays/ConfirmDialog';

export { Card, CardBody, CardHeader, CardTitle, type CardPadding, type CardProps } from './components/surfaces/Card';
export { FloatingCard, type FloatingCardProps } from './components/surfaces/FloatingCard';
export {
  Sticker,
  StickerTile,
  STICKER_ICON_NAMES,
  STICKER_NAMES,
  hasSticker,
  stickerFor,
  type StickerChoice,
  type StickerKind,
  type StickerName,
  type StickerProps,
  type StickerTileProps,
  type StickerTileSize,
  type StickerTone,
} from './components/stickers';
export { IconTile, type IconTileProps, type IconTileSize, type IconTileTone } from './components/surfaces/IconTile';
export { Eyebrow, type EyebrowProps } from './components/surfaces/Eyebrow';
export {
  ContextSection,
  Collapsible,
  type ContextSectionProps,
} from './components/surfaces/ContextSection';

export { AppFrame, type AppFrameProps } from './components/layout/AppFrame';
export {
  Sidebar,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarSeparator,
  type SidebarGroupProps,
  type SidebarProps,
} from './components/layout/Sidebar';
export { NavItem, type NavItemProps } from './components/layout/NavItem';
export { PaneHeader, type PaneHeaderProps } from './components/layout/PaneHeader';
export {
  PaneBody,
  PageColumn,
  type PageColumnProps,
  type PageWidth,
  type PaneBodyProps,
} from './components/layout/PaneBody';
export { MobileFrame, type MobileFrameProps } from './components/layout/MobileFrame';
export {
  TabBar,
  TabBarAction,
  TabBarItem,
  type TabBarActionProps,
  type TabBarItemProps,
  type TabBarProps,
} from './components/layout/TabBar';
export { TopBar, type TopBarProps } from './components/layout/TopBar';
export { ModulePill, type ModulePillProps, type ModulePillVariant } from './components/layout/ModulePill';
