import { useT } from '@alavo-daily/common';
import { Button, ConfirmDialog, Dialog } from '@alavo-daily/design-system';
import { useState } from 'react';

import { describeEngineError } from '../../engine-errors';

export interface DeleteConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  failureTitle: string;
  onDelete: () => Promise<unknown>;
}

export function DeleteConfirm({ open, onOpenChange, title, description, failureTitle, onDelete }: DeleteConfirmProps) {
  const t = useT();
  const [failure, setFailure] = useState<string | null>(null);
  const run = async () => {
    try {
      await onDelete();
    } catch (error) {
      setFailure(describeEngineError(error, t));
    }
  };
  return (
    <>
      <ConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        confirmLabel={t('Xoá')}
        cancelLabel={t('Huỷ')}
        destructive
        onConfirm={() => void run()}
      />
      <Dialog
        open={failure !== null}
        onOpenChange={(next) => !next && setFailure(null)}
        title={failureTitle}
        description={failure ?? ''}
        footer={<Button onClick={() => setFailure(null)}>{t('Đã hiểu')}</Button>}
      />
    </>
  );
}
