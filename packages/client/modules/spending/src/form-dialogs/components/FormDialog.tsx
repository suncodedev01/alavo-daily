import { useT } from '@alavo-daily/common';
import { Button, ResponsiveDialog, type ResponsiveDialogProps } from '@alavo-daily/design-system';
import { useId, type ReactNode } from 'react';

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  onSubmit: () => void;
  pending?: boolean;
  error?: string | null;
  description?: string;
  docks?: ResponsiveDialogProps['docks'];
  children: ReactNode;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  onSubmit,
  pending = false,
  error,
  description,
  docks,
  children,
}: FormDialogProps) {
  const t = useT();
  const formId = useId();
  const footer = (
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        {t('Huỷ')}
      </Button>
      <Button type="submit" form={formId} disabled={pending}>
        {submitLabel}
      </Button>
    </>
  );
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={title} description={description} footer={footer} docks={docks}>
      <form
        id={formId}
        noValidate
        className="grid min-w-0 gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {children}
        {error ? (
          <p role="alert" className="text-sm text-destructive-fg">
            {error}
          </p>
        ) : null}
      </form>
    </ResponsiveDialog>
  );
}
