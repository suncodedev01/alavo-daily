import { ModalPanel, type ModalPanelProps } from './ModalPanel';

export type SheetProps = Omit<ModalPanelProps, 'variant' | 'role'>;

export function Sheet(props: SheetProps) {
  return <ModalPanel variant="sheet" {...props} />;
}
