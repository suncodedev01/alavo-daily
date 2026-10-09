import { useLayout } from '@/hooks/useLayout';
import { Dialog, type DialogProps } from './Dialog';
import { Sheet } from './Sheet';

export type ResponsiveDialogProps = DialogProps;

export function ResponsiveDialog(props: ResponsiveDialogProps) {
  const layout = useLayout();
  return layout === 'wide' ? <Dialog {...props} /> : <Sheet {...props} />;
}
