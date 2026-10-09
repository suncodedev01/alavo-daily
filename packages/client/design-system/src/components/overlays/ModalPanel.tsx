import type { ReactNode } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Dialog as DialogRoot, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
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
};

const OVERLAY_CLASS = 'bg-scrim supports-backdrop-filter:backdrop-blur-none';

const POPUP_BASE =
  'fixed z-50 grid gap-4 bg-surface text-text-primary shadow-overlay outline-none duration-200 motion-reduce:animate-none data-open:animate-in data-closed:animate-out';

const POPUP_VARIANT: Record<ModalVariant, string> = {
  dialog:
    'inset-x-4 top-1/2 mx-auto max-w-110 -translate-y-1/2 rounded-2xl p-6 data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95',
  sheet:
    'inset-x-0 bottom-0 max-h-dvh overflow-y-auto rounded-t-4xl px-4 pt-3 pb-9 pb-safe data-open:slide-in-from-bottom data-closed:slide-out-to-bottom',
};

function Grabber() {
  return <div aria-hidden className="h-1.25 w-9 justify-self-center rounded-full bg-line-strong" />;
}

export function ModalPanel({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  closeLabel = 'Đóng',
  variant = 'dialog',
  role,
}: ModalPanelProps) {
  return (
    <DialogRoot open={open} onOpenChange={(next) => onOpenChange?.(next)}>
      <DialogPortal>
        <DialogOverlay className={OVERLAY_CLASS} />
        <DialogPrimitive.Popup {...(role ? { role } : {})} className={cn(POPUP_BASE, POPUP_VARIANT[variant])}>
          {variant === 'sheet' ? <Grabber /> : null}
          <div className="flex items-center justify-between gap-2">
            <DialogPrimitive.Title className="min-w-0 text-title font-semibold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              render={<IconButton icon="x" label={closeLabel} size="sm" variant={variant === 'sheet' ? 'surface' : 'ghost'} />}
            />
          </div>
          {description ? (
            <DialogPrimitive.Description className="text-sm text-text-secondary">{description}</DialogPrimitive.Description>
          ) : null}
          {children}
          {footer ? <div className="flex justify-end gap-2">{footer}</div> : null}
        </DialogPrimitive.Popup>
      </DialogPortal>
    </DialogRoot>
  );
}
