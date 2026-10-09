import type { ReactNode } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Dialog as DialogRoot, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDesignSystemTexts } from '../../lib/texts';
import { IconButton } from '../controls/IconButton';

export type ModalVariant = 'dialog' | 'sheet';

export type ModalPanelProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  children?: ReactNode;
  closeLabel?: string;
  variant?: ModalVariant;
  role?: 'dialog' | 'alertdialog';
  docks?: ModalDocks;
};

export type ModalDocks = {
  top?: ReactNode;
  bottom?: ReactNode;
};

const OVERLAY_CLASS = 'bg-scrim supports-backdrop-filter:backdrop-blur-none';

const POPUP_BASE =
  'fixed z-50 flex flex-col gap-4 bg-surface text-text-primary shadow-overlay outline-none duration-200 motion-reduce:animate-none data-open:animate-in data-closed:animate-out';

const POPUP_VARIANT: Record<ModalVariant, string> = {
  dialog:
    'inset-x-4 top-1/2 mx-auto max-h-[calc(100dvh-2rem)] max-w-110 -translate-y-1/2 rounded-2xl p-6 data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95',
  sheet:
    'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-4xl px-4 pt-3 pb-sheet data-open:slide-in-from-bottom data-closed:slide-out-to-bottom',
};

const DOCKED_POPUP_CLASS = 'gap-2 max-h-[96dvh] pb-sheet-tight';

const DOCK_CLASS = 'grid shrink-0 gap-2';

const BODY_CLASS = '-mx-1 -my-1 grid min-h-0 flex-1 content-start gap-4 overflow-y-auto px-1 py-1';

function Grabber() {
  return <div aria-hidden className="h-1.25 w-9 shrink-0 self-center rounded-full bg-line-strong" />;
}

export function ModalPanel({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  closeLabel,
  variant = 'dialog',
  role,
  docks,
}: ModalPanelProps) {
  const texts = useDesignSystemTexts();
  return (
    <DialogRoot open={open} onOpenChange={(next) => onOpenChange?.(next)}>
      <DialogPortal>
        <DialogOverlay className={OVERLAY_CLASS} />
        <DialogPrimitive.Popup
          {...(role ? { role } : {})}
          className={cn(POPUP_BASE, POPUP_VARIANT[variant], docks && DOCKED_POPUP_CLASS)}
        >
          {variant === 'sheet' ? <Grabber /> : null}
          <div className="flex shrink-0 items-center justify-between gap-2">
            <DialogPrimitive.Title className="min-w-0 text-title font-semibold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              render={<IconButton icon="x" label={closeLabel ?? texts.close} size="sm" variant={variant === 'sheet' ? 'surface' : 'ghost'} />}
            />
          </div>
          {description ? (
            <DialogPrimitive.Description className="shrink-0 text-sm text-text-secondary">{description}</DialogPrimitive.Description>
          ) : null}
          {docks?.top ? <div className={DOCK_CLASS}>{docks.top}</div> : null}
          {children ? <div className={BODY_CLASS}>{children}</div> : null}
          {docks?.bottom ? <div className={DOCK_CLASS}>{docks.bottom}</div> : null}
          {footer ? <div className="flex shrink-0 flex-wrap justify-end gap-2 max-lg:[&>*]:grow">{footer}</div> : null}
        </DialogPrimitive.Popup>
      </DialogPortal>
    </DialogRoot>
  );
}
