import { useDesignSystemTexts } from '../../lib/texts';
import { Button } from '../controls/Button';
import { ModalPanel } from './ModalPanel';

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  destructive = false,
}: ConfirmDialogProps) {
  const texts = useDesignSystemTexts();
  const confirm = () => {
    onConfirm();
    onOpenChange(false);
  };
  const footer = (
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        {cancelLabel ?? texts.cancel}
      </Button>
      <Button variant={destructive ? 'destructive' : 'primary'} onClick={confirm}>
        {confirmLabel}
      </Button>
    </>
  );
  return (
    <ModalPanel
      role="alertdialog"
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={footer}
    />
  );
}
