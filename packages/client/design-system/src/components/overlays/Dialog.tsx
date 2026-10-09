import { ModalPanel, type ModalPanelProps } from './ModalPanel';

export type DialogProps = Omit<ModalPanelProps, 'variant' | 'role'>;

export function Dialog(props: DialogProps) {
  return <ModalPanel variant="dialog" {...props} />;
}
